"use client";

import { useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");

    // 1. 先把用户的问题和一条空回复放进历史（空回复是「占位」）
    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages([...history, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      if (!res.ok || !res.body) {
        setMessages([
          ...history,
          { role: "assistant", content: "AI 服务暂时不可用" },
        ]);
        return;
      }

      // 2. 传送带循环：读到一块就更新一次 state
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="font-medium">AI 助手</h2>
      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span
              className={`inline-block border rounded p-2 max-w-[80%] whitespace-pre-wrap ${
                m.role === "user" ? "bg-blue-50" : "bg-gray-50"
              }`}
            >
              {m.content}
              {m.role === "assistant" && loading && m.content === "" && "…"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="问点什么…"
          className="border rounded p-2 flex-1"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-black text-white rounded p-2 disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  );
}
