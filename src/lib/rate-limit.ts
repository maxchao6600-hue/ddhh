import { ApiError } from "@/lib/errors";
import { asNumber, getRow, runSql } from "@/lib/db";

export function clientKey(prefix: string, ip: string): string {
  const clean = ip.replace(/[^\w.:]/g, "").slice(0, 80);
  return `${prefix}:${clean || "unknown"}`;
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<void> {
  const row = await getRow("SELECT hits, reset_at FROM rate_limit_buckets WHERE bucket_key = ?", [key]);
  if (!row || asNumber(row.reset_at) <= now) {
    await runSql(
      `INSERT INTO rate_limit_buckets (bucket_key, hits, reset_at)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET hits = 1, reset_at = excluded.reset_at`,
      [key, now + windowMs],
    );
    return;
  }
  if (asNumber(row.hits) >= limit) {
    throw new ApiError(429, "操作太频繁，请稍后再试");
  }
  await runSql("UPDATE rate_limit_buckets SET hits = hits + 1 WHERE bucket_key = ?", [key]);
}
