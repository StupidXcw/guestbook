import { NextResponse } from "next/server";
import { requireLlmConfig } from "@/lib/llm";
import { isRateLimited } from "@/lib/rateLimit";
import { listMessages } from "@/lib/data";

export async function GET(request: Request) {
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
            "你是「AI 留言板」的分析师。根据用户给出的留言列表，输出 3 个要点：① 留言者的整体情绪 ② 大家聊的主题 ③ 一条给留言者的回复建议。每个要点一行、不超过 30 字，除这 3 行外不要输出任何内容。",
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
