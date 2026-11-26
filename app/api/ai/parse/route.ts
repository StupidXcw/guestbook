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

  // 1. 校验输入（和所有接口一样的第一道门）
  const { text } = await request.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text 不能为空" }, { status: 400 });
  }

  // 2. 调 LLM，让模型做「自然语言 → JSON」的翻译
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
            '你是「AI 留言板」的登记助手。用户会用自然语言描述想发布的留言，你的任务是抽出署名和留言内容，只输出一个 JSON 对象，格式：{"name": "署名", "content": "留言内容"}。不要输出 JSON 以外的任何字符。用户没说署名时 name 用「访客」；如果用户的话里没有任何留言内容，输出 {"name":"","content":""}。',
        },
        // ↓ few-shot：伪造一段示例历史，给模型打样
        { role: "user", content: "留个言：我曾踏平了孤川西风走马，署名朱棣" },
        {
          role: "assistant",
          content: '{"name":"朱棣","content":"永乐大帝"}',
        },
        // ↓ 真实输入
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    console.error("LLM 调用失败:", res.status, await res.text());
    return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
  }

  // 3. 挖出回答，剥掉可能裹着的 markdown 围栏
  let raw = (await res.json()).choices?.[0]?.message?.content ?? "";
  raw = raw.replaceAll("```json", "").replaceAll("```", "").trim();

  // 4. 校验模型输出（模型 = 不可信输入）
  let parsed: { name?: string; content?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "AI 返回了无法解析的内容" },
      { status: 502 },
    );
  }
  if (!parsed.name?.trim() || !parsed.content?.trim()) {
    return NextResponse.json(
      {
        error: "没解析出完整留言，换个说法试试，比如：说今天天气不错，署名小明",
      },
      { status: 400 },
    );
  }

  // 5. 只当翻译官：翻译完就交还给前端，自己不落库
  return NextResponse.json({
    name: parsed.name.trim(),
    content: parsed.content.trim(),
  });
}
