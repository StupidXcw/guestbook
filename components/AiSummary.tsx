"use client";

import { useState } from "react";
import { safeJson } from "@/lib/safeJson";

export default function AiSummary() {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/summary");
      const { ok, data, parseError } = await safeJson(res);
      if (parseError || !ok) {
        setSummary(
          `出错了：${(data.error as string) ?? (parseError ? "服务端返回异常" : "未知错误")}`,
        );
      } else {
        setSummary((data.summary as string) ?? "");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="border rounded px-3 py-1 disabled:opacity-50"
      >
        {loading ? "AI 正在阅读留言…" : "AI 总结"}
      </button>
      {summary && (
        <pre className="whitespace-pre-wrap border rounded p-3">{summary}</pre>
      )}
    </div>
  );
}
