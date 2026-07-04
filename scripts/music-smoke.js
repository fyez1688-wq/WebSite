const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseSetCookie(headerValue) {
  if (!headerValue) return [];
  return headerValue.split(/,(?=\s*[^;,=]+=[^;,]+)/g).map((value) => value.trim());
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(response) {
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : parseSetCookie(response.headers.get("set-cookie"));
    for (const item of setCookies) {
      const [pair] = item.split(";");
      const index = pair.indexOf("=");
      if (index > 0) this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }
}

function asUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl);
}

async function request(baseUrl, pathname, options = {}, jar) {
  const headers = new Headers(options.headers || {});
  if (jar?.header()) headers.set("cookie", jar.header());
  const response = await fetch(asUrl(baseUrl, pathname), {
    ...options,
    headers,
    redirect: options.redirect || "manual"
  });
  if (jar) jar.store(response);
  return response;
}

async function jsonRequest(baseUrl, pathname, options = {}, jar) {
  const response = await request(baseUrl, pathname, options, jar);
  return { response, body: await response.json().catch(() => null) };
}

async function registerUser(baseUrl, email, password) {
  const response = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password, nickname: "音乐验收用户" })
  });
  if (![200, 409].includes(response.status)) {
    throw new Error(`普通用户注册失败：${response.status} ${await response.text()}`);
  }
}

async function login(baseUrl, account, password) {
  const jar = new CookieJar();
  const csrfResponse = await request(baseUrl, "/api/auth/csrf", {}, jar);
  if (csrfResponse.status !== 200) throw new Error(`获取 CSRF 失败：${csrfResponse.status}`);
  const csrf = await csrfResponse.json();
  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    account,
    password,
    redirect: "false",
    callbackUrl: `${baseUrl}/admin`,
    json: "true"
  });
  const loginResponse = await request(
    baseUrl,
    "/api/auth/callback/credentials?json=true",
    { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body },
    jar
  );
  if (loginResponse.status !== 200) throw new Error(`登录失败：${account} ${loginResponse.status}`);
  return jar;
}

function trackPayload(runId, overrides = {}) {
  return {
    title: `E2E_TEST_MUSIC_${runId}`,
    artist: "Smoke Artist",
    album: "Smoke Album",
    description: "Music smoke test track",
    coverImage: "https://example.com/cover.png",
    audioUrl: `https://example.com/audio-${runId}.mp3`,
    sourceUrl: "https://example.com/source",
    license: "Smoke test only",
    category: "Smoke",
    duration: 120,
    sortOrder: 1,
    isPublished: true,
    isFeatured: true,
    ...overrides
  };
}

async function main() {
  loadEnv();
  const baseUrl = process.env.MUSIC_SMOKE_BASE_URL || "http://localhost:3000";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const runId = Date.now().toString(36);
  const userEmail = process.env.MUSIC_SMOKE_USER || `music-smoke-${runId}@pzq1688.local`;
  const userPassword = process.env.MUSIC_SMOKE_PASSWORD || crypto.randomBytes(18).toString("base64url");

  if (!adminEmail || !adminPassword) throw new Error("缺少 ADMIN_EMAIL 或 ADMIN_PASSWORD");

  const publicBefore = await jsonRequest(baseUrl, "/api/music");
  if (publicBefore.response.status !== 200) throw new Error(`游客获取公开音乐失败：${publicBefore.response.status}`);

  await registerUser(baseUrl, userEmail, userPassword);
  const userJar = await login(baseUrl, userEmail, userPassword);
  const userAdmin = await jsonRequest(baseUrl, "/api/admin/music", {}, userJar);
  if (userAdmin.response.status !== 403) throw new Error(`普通用户访问后台音乐接口应返回 403：${userAdmin.response.status}`);

  const adminJar = await login(baseUrl, adminEmail, adminPassword);

  const invalid = await jsonRequest(
    baseUrl,
    "/api/admin/music",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify(trackPayload(runId, { audioUrl: "javascript:alert(1)" }))
    },
    adminJar
  );
  if (invalid.response.status !== 400 || invalid.body?.error?.code !== "VALIDATION_ERROR") {
    throw new Error(`非法音频 URL 应被拒绝：${invalid.response.status} ${JSON.stringify(invalid.body)}`);
  }

  const created = await jsonRequest(
    baseUrl,
    "/api/admin/music",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify(trackPayload(runId))
    },
    adminJar
  );
  if (created.response.status !== 200) throw new Error(`管理员创建音乐失败：${created.response.status} ${JSON.stringify(created.body)}`);
  const publishedId = created.body?.data?.item?.id;

  const hidden = await jsonRequest(
    baseUrl,
    "/api/admin/music",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify(trackPayload(`${runId}_hidden`, { isPublished: false, isFeatured: true }))
    },
    adminJar
  );
  if (hidden.response.status !== 200) throw new Error(`管理员创建未发布音乐失败：${hidden.response.status}`);
  const hiddenId = hidden.body?.data?.item?.id;

  const updated = await jsonRequest(
    baseUrl,
    `/api/admin/music/${publishedId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ title: `E2E_TEST_MUSIC_${runId}_UPDATED`, sortOrder: 2 })
    },
    adminJar
  );
  if (updated.response.status !== 200 || updated.body?.data?.item?.sortOrder !== 2) {
    throw new Error(`管理员编辑音乐失败：${updated.response.status} ${JSON.stringify(updated.body)}`);
  }

  const publicList = await jsonRequest(baseUrl, `/api/music?q=${encodeURIComponent(runId)}`);
  const publicItems = publicList.body?.data?.items || [];
  if (!publicItems.some((item) => item.id === publishedId)) throw new Error("已发布音乐未出现在前台接口");
  if (publicItems.some((item) => item.id === hiddenId)) throw new Error("未发布音乐不应出现在前台接口");

  const featured = await jsonRequest(baseUrl, "/api/music/featured");
  const featuredItems = featured.body?.data?.items || [];
  if (!featuredItems.every((item) => item.isFeatured)) throw new Error("首页推荐接口返回了非推荐音乐");
  if (featuredItems.some((item) => item.id === hiddenId)) throw new Error("首页推荐接口不应返回未发布音乐");

  const hiddenPlay = await jsonRequest(baseUrl, `/api/music/${hiddenId}/play`, { method: "POST" });
  if (hiddenPlay.response.status !== 404) throw new Error(`未发布音乐播放量接口应返回 404：${hiddenPlay.response.status}`);

  const playOne = await jsonRequest(baseUrl, `/api/music/${publishedId}/play`, { method: "POST" });
  const playTwo = await jsonRequest(baseUrl, `/api/music/${publishedId}/play`, { method: "POST" });
  if (playOne.response.status !== 200 || playTwo.response.status !== 200 || playTwo.body?.data?.counted !== false) {
    throw new Error(`播放量基础防刷失败：${playOne.response.status}/${playTwo.response.status} ${JSON.stringify(playTwo.body)}`);
  }

  const deleted = await jsonRequest(
    baseUrl,
    `/api/admin/music/${publishedId}`,
    { method: "DELETE", headers: { origin: baseUrl } },
    adminJar
  );
  if (deleted.response.status !== 200 || deleted.body?.data?.item?.deletedAt === null) {
    throw new Error(`管理员软删除音乐失败：${deleted.response.status} ${JSON.stringify(deleted.body)}`);
  }

  await jsonRequest(baseUrl, `/api/admin/music/${hiddenId}`, { method: "DELETE", headers: { origin: baseUrl } }, adminJar);

  const afterDelete = await jsonRequest(baseUrl, `/api/music?q=${encodeURIComponent(runId)}`);
  if ((afterDelete.body?.data?.items || []).some((item) => item.id === publishedId)) {
    throw new Error("软删除音乐不应继续出现在前台接口");
  }

  console.log("音乐模块验收通过：公开读取、发布过滤、后台权限、增改软删、非法 URL、推荐接口和播放量防刷均符合预期。");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
