// app/api/ai/chat/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // 1. 拿用户发来的话
  const { message } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message 不能为空" }, { status: 400 });
  }

  // 2. 调 LLM（服务端，key 安全）
  const res = await fetch(process.env.LLM_BASE_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages: [
        {
          role: "system",
          content: "你是一个简洁的助手，回答控制在两句话以内。",
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
