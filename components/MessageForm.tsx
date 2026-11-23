"use client"; // ① 别忘这行（第 4 步的知识）
import { useState } from "react";

export default function MessageForm() {
  // ② 组件函数外壳——所有 Hook 必须在它里面
  const [name, setName] = useState(""); // ③ 三个 state 缺一不可
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

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
    } else {
      const { error } = await res.json();
      setPreview(`失败：${error}`);
    }
    setLoading(false);
    // ← 片段到这结束
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
        <p className={preview.startsWith("失败") ? "text-red-600" : "text-green-700"}>
          {preview}
        </p>
      )}
    </div>
  );
}
