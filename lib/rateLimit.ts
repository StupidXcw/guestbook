// lib/rateLimit.ts —— 内存滑动窗口限流（学习项目够用；多实例/重启场景需换 Redis）
// 原理：每个 key 记录最近时间戳数组，窗口外的丢掉，窗口内超上限就拒绝。
const hits = new Map<string, number[]>();

const WINDOW_MS = 60_000; // 统计窗口：1 分钟
const MAX_HITS = 10;      // 窗口内最多 10 次

/** 是否应被限流；同时顺带记录本次调用 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // 只保留窗口内的时间戳（过期的自然被过滤掉）
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_HITS) {
    hits.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  // 防 Map 无限膨胀：超过 1000 个 key 时清理已过期的
  if (hits.size > 1000) {
    for (const [k, ts] of hits) {
      if (ts.every((t) => t <= windowStart)) hits.delete(k);
    }
  }

  return false;
}
