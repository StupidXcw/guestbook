import { NextResponse } from "next/server";
import { getMessage } from "@/lib/data";

// store 里补一个：
// export function getMessage(id: number) {
//   return messages.find((m) => m.id === id);
// }

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params; // 坑 1：Promise 要 await
  const numId = Number(id); // 坑 2：永远是 string
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "无效的 id" }, { status: 400 });
  }
  const message = getMessage(numId);
  if (!message) {
    return NextResponse.json({ error: "留言不存在" }, { status: 404 });
  }
  return NextResponse.json(message);
}
