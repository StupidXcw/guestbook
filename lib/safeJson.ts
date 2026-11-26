// lib/safeJson.ts —— 安全地「吃掉」一个响应
// 原则：外部响应不可信。text() 永不抛异常，JSON.parse 套 try/catch，
// 三个出口：成功给 data；能读但格式坏给 parseError；其他情况 error 由调用方按 res.ok 解释。
export async function safeJson(res: Response): Promise<{
  ok: boolean;
  data: Record<string, unknown>;
  parseError: boolean;
}> {
  const text = await res.text(); // ① text() 什么都能接，永不抛解析异常
  let data: Record<string, unknown> = {};
  let parseError = false;
  try {
    data = JSON.parse(text); // ② 再尝试按 JSON 解析
  } catch {
    parseError = true; // ③ 500 + 空 body 就会走到这
  }
  return { ok: res.ok, data, parseError };
}
