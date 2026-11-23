import type { Message } from "./types";

/**
 * 关键点：Next.js 会把「页面」和「Route Handler」编译成互相独立的 bundle，
 * 各自实例化一份模块。如果直接写 const messages = []，页面和接口
 * 各持一个空数组，POST 进接口的数据页面永远看不到。
 *
 * 解法（社区标准做法，Prisma 同款）：把数据钉在 globalThis 上——
 * 它是 Node 进程级的全局对象，跨所有 bundle 共享。
 */
type Store = {
  messages: Message[];
  nextId: number;
};

const globalStore = globalThis as typeof globalThis & {
  __guestbookStore?: Store;
};

const store: Store = (globalStore.__guestbookStore ??= {
  messages: [],
  nextId: 1,
});

export function listMessages(): Message[] {
  return store.messages;
}

export function addMessage(data: Omit<Message, "id" | "createdAt">): Message {
  const m: Message = {
    ...data,
    id: store.nextId++,
    createdAt: new Date().toISOString(),
  };
  store.messages.unshift(m);
  return m;
}

// lib/data.ts —— 加在 addMessage 后面
export function getMessage(id: number): Message | undefined {
  return store.messages.find((m) => m.id === id);
}
