// lib/llm.ts —— LLM 公共层：环境变量检查 + 配置缺失响应（二合一）
// 返回「判别联合」：配置齐全给 LlmConfig；缺失给现成的 500 响应。
// 调用方用 instanceof 区分，TS 自动收窄，两行搞定。
import { NextResponse } from "next/server";

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

/** 读取并校验 LLM 环境变量。缺失时返回现成的 500 响应，调用方直接 return 即可 */
export function requireLlmConfig(): LlmConfig | NextResponse {
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (baseUrl && apiKey && model) {
    return { baseUrl, apiKey, model };
  }
  console.error("缺少 LLM 环境变量配置");
  return NextResponse.json({ error: "服务端配置缺失" }, { status: 500 });
}
