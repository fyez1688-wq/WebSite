import { headers } from "next/headers";
import { fail } from "@/lib/response";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const item = buckets.get(key);
  if (!item || item.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  item.count += 1;
  return item.count <= limit;
}

export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host) return null;
  try {
    if (new URL(origin).host !== host) {
      return fail("CSRF_BLOCKED", "请求来源无效", 403);
    }
  } catch {
    return fail("CSRF_BLOCKED", "请求来源无效", 403);
  }
  return null;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
