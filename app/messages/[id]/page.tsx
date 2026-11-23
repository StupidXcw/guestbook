import { getMessage } from "@/lib/data";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const instant = false;

export default async function MessagePage({ params }: Props) {
  const { id } = await params;
  const message = getMessage(Number(id));
  if (!message) notFound(); // 渲染 404 页面，比手写报错优雅

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{message.name} 的留言</h1>
      <p className="mt-4 text-gray-700">{message.content}</p>
      <p className="mt-2 text-xs text-gray-400">{message.createdAt}</p>
    </main>
  );
}
