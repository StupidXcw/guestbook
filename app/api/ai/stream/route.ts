import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { message } = await request.json();
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message 不能为空" }, { status: 400 });
  }

  // 1. 调 LLM，打开流式开关
  const upstream = await fetch(process.env.LLM_BASE_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      stream: true,
      messages: [
        {
          role: "system",
          content: "你是留言板的 AI 助手，回答简洁，不超过五句话。",
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
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
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
