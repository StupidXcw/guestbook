import { NextResponse } from "next/server";
import { listMessages, addMessage } from "@/lib/data";

export async function GET() {
  return NextResponse.json(listMessages());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const { name, content } = (body ?? {}) as { name?: string; content?: string };
  if (!name?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: "name 和 content 必填" },
      { status: 400 },
    );
  }
  return NextResponse.json(
    addMessage({ name: name.trim(), content: content.trim() }),
    { status: 201 },
  );
}
