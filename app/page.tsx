import Link from "next/link";
import { listMessages } from "@/lib/data";
import MessageForm from "@/components/MessageForm";
import AiSummary from "@/components/AiSummary";
import ChatPanel from "@/components/ChatPanel";

export default async function Home() {
  const messages = listMessages();
  const announce = process.env.SITE_ANNOUNCE;
  return (
    <div className="flex flex-col gap-8 p-8 lg:flex-row lg:items-start">
      <main className="min-w-0 flex-1 space-y-3">
        <h1 className="text-2xl font-bold">{announce}</h1>
        {messages.map((m) => (
          <Link
            key={m.id}
            href={`/messages/${m.id}`}
            className="block border rounded p-3"
          >
            <p className="font-medium">{m.name}</p>
            <p className="text-gray-700">{m.content}</p>
            <p className="text-xs text-gray-400">
              {new Date(m.createdAt).toLocaleString("zh-CN", {
                timeZone: "Asia/Shanghai",
                hour12: false,
              })}
            </p>
          </Link>
        ))}
        <MessageForm />
        <AiSummary />
      </main>
      <aside className="w-full shrink-0 rounded-lg border p-4 lg:sticky lg:top-4 lg:w-80">
        <ChatPanel />
      </aside>
    </div>
  );
}
