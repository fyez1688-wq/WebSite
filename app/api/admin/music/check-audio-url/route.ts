import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import { requireAdminApi } from "@/lib/permissions";
import { fail, ok } from "@/lib/response";
import { assertSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const requestSchema = z.object({
  audioUrl: z.string().trim().min(1, "请先填写音频 URL").max(500, "音频 URL 过长")
});

const timeoutMs = 5_000;

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mappedIpv4 || normalized;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ipv4)) return false;
  const [first, second] = ipv4.split(".").map(Number);
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

async function validatePublicAudioUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("音频 URL 格式不正确");
  }

  if (!["http:", "https:"].includes(url.protocol)) throw new Error("音频 URL 只支持 http 或 https");
  if (url.username || url.password) throw new Error("音频 URL 不能包含账号信息");

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || isPrivateAddress(hostname)) {
    throw new Error("不允许检测本机或私网地址");
  }

  if (!isIP(hostname)) {
    let addresses: { address: string }[];
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("无法解析音频 URL 的域名");
    }
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new Error("不允许检测本机或私网地址");
    }
  }

  return url;
}

async function checkRequest(url: URL, method: "HEAD" | "GET") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "audio/*,application/octet-stream;q=0.9,*/*;q=0.1" }
    });
    const contentType = response.headers.get("content-type");
    await response.body?.cancel();
    return { response, contentType };
  } catch (error) {
    return { error };
  } finally {
    clearTimeout(timer);
  }
}

function resultForResponse(response: Response, contentType: string | null) {
  if (response.ok && (!contentType || contentType.startsWith("audio/") || contentType.startsWith("application/octet-stream"))) {
    return { ok: true, status: response.status, contentType, message: "音频链接可访问" };
  }
  if (response.ok) {
    return { ok: false, status: response.status, contentType, message: "链接可访问，但响应不是音频内容" };
  }
  if (response.status >= 300 && response.status < 400) {
    return { ok: false, status: response.status, contentType, message: "链接返回重定向，请填写最终音频地址" };
  }
  return { ok: false, status: response.status, contentType, message: "音频链接不可访问" };
}

export async function POST(request: Request) {
  const csrf = await assertSameOrigin();
  if (csrf) return csrf;
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message || "参数错误");

  let url: URL;
  try {
    url = await validatePublicAudioUrl(parsed.data.audioUrl);
  } catch (error) {
    return fail("VALIDATION_ERROR", error instanceof Error ? error.message : "音频 URL 不可检测");
  }

  const head = await checkRequest(url, "HEAD");
  const shouldTryGet = !head.response || !head.response.ok || head.response.status === 405;
  const checked = shouldTryGet ? await checkRequest(url, "GET") : head;

  if (!checked.response) {
    const timedOut = checked.error instanceof DOMException && checked.error.name === "AbortError";
    return ok({ ok: false, status: null, contentType: null, message: timedOut ? "检测超时，请稍后再试" : "无法检测该音频链接" });
  }

  return ok(resultForResponse(checked.response, checked.contentType));
}
