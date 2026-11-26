// app/api/ai/chat/route.ts
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

  // 1. 拿用户发来的话
  const { message } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message 不能为空" }, { status: 400 });
  }

  // 2. 调 LLM（服务端，key 安全）
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是「AI 留言板」的对话助手。回答简洁友好，控制在两句话以内；不确定的事情不要编造。",
        },
        { role: "user", content: message },
      ],
    }),
  });

  // 3. 别人家的接口，出错时不一定给你 JSON，先看状态码
  if (!res.ok) {
    const detail = await res.text();
    console.error("LLM 调用失败:", res.status, detail);
    return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
  }

  // 4. 从返回结构里挖出回答
  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ reply });
}
