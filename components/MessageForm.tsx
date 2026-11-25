"use client"; // ① 别忘这行（第 4 步的知识）
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageForm() {
  const router = useRouter();
  // ② 组件函数外壳——所有 Hook 必须在它里面
  const [name, setName] = useState(""); // ③ 三个 state 缺一不可
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentence, setSentence] = useState(""); // ← 新增：一句话输入

  async function submit() {
    // ← 你的片段从这开始，原样放进来的部分全都不用改
    setLoading(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });
    if (res.ok) {
      setContent("");
      setPreview("留言成功！刷新页面可见");
      router.refresh();
    } else {
      const { error } = await res.json();
      setPreview(`失败：${error}`);
    }
    setLoading(false);
    // ← 片段到这结束
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
      const parsed = await parseRes.json();
      if (!parseRes.ok) {
        setPreview(`失败：${parsed.error}`);
        return;
      }

      // 第二跳：走原有落库接口（AI 不碰数据层）
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.name, content: parsed.content }),
      });
      if (res.ok) {
        setPreview(
          `AI 已添加：[${parsed.name}] ${parsed.content}，刷新页面可见`,
        );
        setSentence("");
        router.refresh();
      } else {
        const { error } = await res.json();
        setPreview(`失败：${error}`);
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
