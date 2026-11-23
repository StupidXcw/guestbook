import Link from "next/link";
import { listMessages } from "@/lib/data";
import MessageForm from "@/components/MessageForm";

export default async function Home() {
  const messages = listMessages();
  const announce = process.env.SITE_ANNOUNCE;
  return (
    <main className="p-8 space-y-3">
      <h1 className="text-2xl font-bold">{announce}</h1>
      {messages.map((m) => (
        <Link
          key={m.id}
          href={`/messages/${m.id}`}
          className="block border rounded p-3"
        >
          <p className="font-medium">{m.name}</p>
          <p className="text-gray-700">{m.content}</p>
          <p className="text-xs text-gray-400">{m.createdAt}</p>
        </Link>
      ))}
      <MessageForm />
    </main>
  );
}
