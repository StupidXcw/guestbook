"use client"; // ① 别忘这行（第 4 步的知识）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeJson } from "@/lib/safeJson";

export default function MessageForm() {
  const router = useRouter();
  // ② 组件函数外壳——所有 Hook 必须在它里面
  const [name, setName] = useState(""); // ③ 三个 state 缺一不可
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentence, setSentence] = useState(""); // ← 新增：一句话输入

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });
      const { ok, data, parseError } = await safeJson(res);
      if (parseError || !ok) {
        setPreview(
          `失败：${(data.error as string) ?? (parseError ? "服务端返回异常" : "未知错误")}`,
        );
      } else {
        setContent("");
        setPreview("留言成功！");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  // ← 新增：AI 一句话添加
  async function aiSubmit() {
    setLoading(true);
    try {
      // 第一跳：AI 翻译
      const parseRes = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence }),
      });
      const parsed = await safeJson(parseRes);
      if (parsed.parseError || !parsed.ok) {
        setPreview(
          `失败：${(parsed.data.error as string) ?? (parsed.parseError ? "AI 服务异常" : "未知错误")}`,
        );
        return;
      }
      const name = parsed.data.name as string;
      const content = parsed.data.content as string;

      // 第二跳：走原有落库接口（AI 不碰数据层）
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content }),
      });
      const saved = await safeJson(res);
      if (saved.parseError || !saved.ok) {
        setPreview(
          `失败：${(saved.data.error as string) ?? (saved.parseError ? "服务端返回异常" : "未知错误")}`,
        );
      } else {
        setPreview(`AI 已添加：[${name}] ${content}`);
        setSentence("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    // ④ JSX：submit 在这里被「用」
    <div className="p-8 space-y-3 border-t">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="你的名字"
        className="border rounded p-2 w-full"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="写点什么…"
        className="border rounded p-2 w-full"
      />
      <button
        onClick={submit}
        disabled={loading}
        className="bg-black text-white rounded p-2 disabled:opacity-50"
      >
        {loading ? "提交中…" : "提交"}
      </button>
      {preview && (
        <p
          className={
            preview.startsWith("失败") ? "text-red-600" : "text-green-700"
          }
        >
          {preview}
        </p>
      )}

      {/* ↓ 新增 AI 通道 */}
      <input
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
        placeholder="或者用一句话：说今天天气不错，署名小明"
        className="border rounded p-2 w-full"
      />
      <button
        onClick={aiSubmit}
        disabled={loading || !sentence.trim()}
        className="border rounded p-2 disabled:opacity-50"
      >
        {loading ? "AI 处理中…" : "AI 添加"}
      </button>
    </div>
  );
}
