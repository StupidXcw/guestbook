import { NextResponse } from "next/server";
import { listMessages } from "@/lib/data";

export async function GET() {
  const messages = listMessages();
  // 1. 没留言就没得总结
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "还没有留言，先去写一条吧" },
      { status: 400 },
    );
  }

  // 2. 上下文保护：只取最近 20 条
  const recent = messages.slice(0, 20);

  // 3. 数据注入：数组 → 编号文本
  const transcript = recent
    .map((m, i) => `${i + 1}. [${m.name}] ${m.content}`)
    .join("\n");

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
          content:
            "你是留言板分析师。根据用户给出的留言列表，输出 3 个要点：①留言者的整体情绪 ②大家聊的主题 ③一条给留言者的回复建议。每个要点一行，不超过 30 字。",
        },
        {
          role: "user",
          content: `以下是留言板最近 ${recent.length} 条留言：\n\n${transcript}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("LLM 调用失败:", res.status, detail);
    return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
  }

  const data = await res.json();
  const summary = data.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ summary });
}
