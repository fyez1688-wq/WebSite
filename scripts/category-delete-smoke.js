const fs = require("node:fs");
const path = require("node:path");

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
    return Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
  }
}

function asUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl);
}

async function request(baseUrl, pathname, options = {}, jar) {
  const headers = new Headers(options.headers || {});
  if (jar?.header()) headers.set("cookie", jar.header());
  const response = await fetch(asUrl(baseUrl, pathname), { ...options, headers, redirect: options.redirect || "manual" });
  if (jar) jar.store(response);
  return response;
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
  if (loginResponse.status !== 200) throw new Error(`管理员登录失败：${loginResponse.status}`);
  return jar;
}

async function json(response) {
  return response.json().catch(() => null);
}

async function createCategory(baseUrl, jar, name, slug) {
  const response = await request(
    baseUrl,
    "/api/admin/categories",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ name, slug, description: "分类删除验收", isEnabled: true, sortOrder: 9999 })
    },
    jar
  );
  const body = await json(response);
  if (response.status !== 200) throw new Error(`创建分类失败：${response.status} ${JSON.stringify(body)}`);
  return body.data.item;
}

async function createContent(baseUrl, jar, categoryId, slug) {
  const response = await request(
    baseUrl,
    "/api/admin/contents",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({
        title: "分类移动删除验收",
        slug,
        summary: "分类移动删除验收",
        content: "正文",
        contentType: "ARTICLE",
        status: "DRAFT",
        categoryId,
        tagIds: [],
        isFeatured: false,
        isPinned: false,
        allowFavorite: true,
        sortOrder: 0
      })
    },
    jar
  );
  const body = await json(response);
  if (response.status !== 200) throw new Error(`创建内容失败：${response.status} ${JSON.stringify(body)}`);
  return body.data.content;
}

async function deleteCategory(baseUrl, jar, id, moveToCategoryId) {
  const response = await request(
    baseUrl,
    `/api/admin/categories/${id}`,
    {
      method: "DELETE",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: moveToCategoryId ? JSON.stringify({ moveToCategoryId }) : undefined
    },
    jar
  );
  return { response, body: await json(response) };
}

async function deleteContent(baseUrl, jar, id) {
  await request(baseUrl, `/api/admin/contents/${id}`, { method: "DELETE", headers: { origin: baseUrl } }, jar);
}

async function main() {
  loadEnv();
  const baseUrl = process.env.CATEGORY_DELETE_SMOKE_BASE_URL || "http://localhost:3000";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("缺少 ADMIN_EMAIL 或 ADMIN_PASSWORD");

  const jar = await login(baseUrl, adminEmail, adminPassword);
  const runId = Date.now().toString(36);
  const source = await createCategory(baseUrl, jar, `待删除分类 ${runId}`, `delete-source-${runId}`);
  const target = await createCategory(baseUrl, jar, `目标分类 ${runId}`, `delete-target-${runId}`);
  const content = await createContent(baseUrl, jar, source.id, `category-delete-smoke-${runId}`);

  try {
    const direct = await deleteCategory(baseUrl, jar, source.id);
    if (direct.response.status !== 400 || direct.body?.error?.code !== "CATEGORY_IN_USE") {
      throw new Error(`有关联内容的分类应禁止直接删除：${direct.response.status} ${JSON.stringify(direct.body)}`);
    }

    const moved = await deleteCategory(baseUrl, jar, source.id, target.id);
    if (moved.response.status !== 200) {
      throw new Error(`移动内容后删除分类失败：${moved.response.status} ${JSON.stringify(moved.body)}`);
    }
    if (moved.body?.data?.movedContentCount !== 1) throw new Error("移动内容数量不正确");

    const contentResponse = await request(baseUrl, `/api/admin/contents/${content.id}`, {}, jar);
    const contentBody = await json(contentResponse);
    if (contentResponse.status !== 200) throw new Error(`读取内容失败：${contentResponse.status}`);
    if (contentBody.data.content.categoryId !== target.id) throw new Error("内容未移动到目标分类");

    const sourceResponse = await request(baseUrl, "/api/admin/categories", {}, jar);
    const sourceBody = await json(sourceResponse);
    if (sourceBody.data.items.some((item) => item.id === source.id)) throw new Error("源分类仍然存在");
  } finally {
    await deleteContent(baseUrl, jar, content.id).catch(() => undefined);
    await deleteCategory(baseUrl, jar, target.id).catch(() => undefined);
  }

  console.log("分类移动后删除验收通过：直接删除受阻，移动后删除成功，内容分类已更新。");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
