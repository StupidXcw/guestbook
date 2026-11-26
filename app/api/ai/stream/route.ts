import { NextResponse } from "next/server";
import { requireLlmConfig } from "@/lib/llm";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // 0. 限流：同一 IP 一分钟最多 10 次（防 Key 被刷爆）
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(`ai:${ip}`)) {
    return NextResponse.json(
      { error: "请求太频繁，请一分钟后再试" },
      { status: 429 },
    );
  }

  // 1. LLM 配置检查（公共层，见 lib/llm.ts）
  const llm = requireLlmConfig();
  if (llm instanceof NextResponse) return llm;
  const { baseUrl, apiKey, model } = llm;

  const { message } = await request.json();
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message 不能为空" }, { status: 400 });
  }

  // 1. 调 LLM，打开流式开关
  const upstream = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true, // 流式输出
      messages: [
        {
          role: "system",
          content:
            "你是「AI 留言板」的对话助手。回答简洁友好，不超过五句话；不确定的事情不要编造。",
        },
        { role: "user", content: message },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    console.error("LLM 调用失败:", upstream.status, await upstream.text());
    return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
  }

  // 2. 把上游的 SSE 流翻译成纯文本流
  // body 已在上面守卫过非空；捕获成局部常量，让闭包里也能拿到收窄后的类型（免 `!`）
  const upstreamBody = upstream.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE 事件之间用空行分隔；最后一段可能不完整，留在 buffer 里
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            for (const line of event.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {
                // 单块解析失败直接跳过，别让一个坏块弄死整条流
              }
            }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
