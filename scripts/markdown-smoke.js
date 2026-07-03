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
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    },
    jar
  );
  if (loginResponse.status !== 200) throw new Error(`管理员登录失败：${loginResponse.status}`);
  return jar;
}

function assertContains(html, value, label) {
  if (!html.includes(value)) throw new Error(`${label} 未找到：${value}`);
}

function assertNotContains(html, value, label) {
  if (html.includes(value)) throw new Error(`${label} 不应包含：${value}`);
}

async function createContent(baseUrl, jar, payload) {
  const response = await request(
    baseUrl,
    "/api/admin/contents",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify(payload)
    },
    jar
  );
  const body = await response.json().catch(() => null);
  if (response.status !== 200) throw new Error(`创建内容失败：${response.status} ${JSON.stringify(body)}`);
  return body.data.content;
}

async function deleteContent(baseUrl, jar, id) {
  await request(
    baseUrl,
    `/api/admin/contents/${id}`,
    {
      method: "DELETE",
      headers: { origin: baseUrl }
    },
    jar
  );
}

async function main() {
  loadEnv();
  const baseUrl = process.env.MARKDOWN_SMOKE_BASE_URL || "http://localhost:3000";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("缺少 ADMIN_EMAIL 或 ADMIN_PASSWORD");

  const jar = await login(baseUrl, adminEmail, adminPassword);
  const categoriesResponse = await request(baseUrl, "/api/admin/categories", {}, jar);
  if (categoriesResponse.status !== 200) throw new Error(`读取分类失败：${categoriesResponse.status}`);
  const categories = await categoriesResponse.json();
  const category = categories.data.items.find((item) => item.isEnabled) || categories.data.items[0];
  if (!category) throw new Error("没有可用分类，无法创建 Markdown 测试内容");

  const runId = Date.now().toString(36);
  const markdown = [
    "# 一级标题",
    "",
    "## 二级标题",
    "",
    "普通段落，包含 **加粗**、*斜体*、~~删除线~~、`inlineCode`。",
    "",
    "- [x] 已完成任务",
    "- [ ] 未完成任务",
    "  - 嵌套列表",
    "",
    "1. 有序列表",
    "2. 第二项",
    "",
    "> 引用内容",
    "",
    "---",
    "",
    "| 名称 | 值 |",
    "| --- | --- |",
    "| 表格 | 正常 |",
    "",
    "https://example.com/auto-link",
    "",
    "[安全链接](https://example.com/docs)",
    "[危险链接](javascript:alert(1))",
    "![安全图片](https://example.com/a.png)",
    "",
    "```typescript",
    "const value: string = '<script>alert(1)</script>';",
    "console.log(value);",
    "```",
    "",
    "```unknown-lang",
    "<img src=x onerror=alert(1)>",
    "```",
    "",
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<iframe src=\"https://example.com\"></iframe>"
  ].join("\n");

  const basePayload = {
    title: `Markdown 验收 ${runId}`,
    slug: `markdown-smoke-${runId}`,
    summary: "Markdown 渲染验收内容",
    content: markdown,
    contentType: "ARTICLE",
    categoryId: category.id,
    tagIds: [],
    isFeatured: false,
    isPinned: false,
    allowFavorite: true,
    sortOrder: 0
  };

  const created = [];
  try {
    const published = await createContent(baseUrl, jar, { ...basePayload, status: "PUBLISHED" });
    created.push(published);
    const draft = await createContent(baseUrl, jar, { ...basePayload, title: `草稿 ${runId}`, slug: `markdown-draft-${runId}`, status: "DRAFT" });
    created.push(draft);
    const offline = await createContent(baseUrl, jar, { ...basePayload, title: `下架 ${runId}`, slug: `markdown-offline-${runId}`, status: "OFFLINE" });
    created.push(offline);
    const deleted = await createContent(baseUrl, jar, { ...basePayload, title: `删除 ${runId}`, slug: `markdown-deleted-${runId}`, status: "PUBLISHED" });
    created.push(deleted);
    await deleteContent(baseUrl, jar, deleted.id);

    const publicResponse = await request(baseUrl, `/contents/${published.slug}`, { redirect: "follow" });
    if (publicResponse.status !== 200) throw new Error(`正式详情页访问失败：${publicResponse.status}`);
    const publicHtml = await publicResponse.text();

    assertContains(publicHtml, "一级标题", "一级标题渲染");
    assertContains(publicHtml, "markdown-table-wrap", "GFM 表格渲染");
    assertContains(publicHtml, "checkbox", "任务列表渲染");
    assertContains(publicHtml, "inlineCode", "行内代码渲染");
    assertContains(publicHtml, "typescript", "代码语言标记");
    assertContains(publicHtml, "plaintext", "未知语言降级");
    assertContains(publicHtml, "复制代码", "复制按钮");
    assertContains(publicHtml, "rel=\"noopener noreferrer\"", "外链安全属性");
    assertContains(publicHtml, "href=\"#\"", "危险链接降级");
    assertContains(publicHtml, "loading=\"lazy\"", "图片懒加载");
    assertNotContains(publicHtml, "<script>alert(1)</script>", "原始 script 安全过滤");
    assertNotContains(publicHtml, "<iframe", "iframe 安全过滤");
    assertNotContains(publicHtml, "<img src=x", "原始 img 标签安全过滤");
    assertNotContains(publicHtml, "onerror=\"", "事件处理器安全过滤");
    assertNotContains(publicHtml, "href=\"javascript:alert", "危险协议安全过滤");

    for (const item of [draft, offline, deleted]) {
      const response = await request(baseUrl, `/contents/${item.slug}`, { redirect: "follow" });
      const html = await response.text();
      const blocked = response.status === 404 || html.includes("页面不存在或内容不可访问");
      if (!blocked || html.includes(item.title)) {
        throw new Error(`${item.slug} 不应被普通用户访问，实际状态码 ${response.status}`);
      }
    }

    const beforePreview = await request(baseUrl, `/api/admin/contents/${draft.id}`, {}, jar).then((response) => response.json());
    const previewResponse = await request(baseUrl, `/admin/content/${draft.id}/preview`, { redirect: "follow" }, jar);
    if (previewResponse.status !== 200) throw new Error(`管理员草稿预览失败：${previewResponse.status}`);
    const previewHtml = await previewResponse.text();
    assertContains(previewHtml, "管理员预览，不增加浏览量", "管理员预览标识");
    assertContains(previewHtml, "返回编辑", "返回编辑按钮");
    assertContains(previewHtml, "markdown-table-wrap", "管理员预览 Markdown 渲染");

    const afterPreview = await request(baseUrl, `/api/admin/contents/${draft.id}`, {}, jar).then((response) => response.json());
    if (beforePreview.data.content.viewCount !== afterPreview.data.content.viewCount) {
      throw new Error("管理员预览不应增加浏览量");
    }
  } finally {
    for (const item of created) {
      if (item?.id) await deleteContent(baseUrl, jar, item.id).catch(() => undefined);
    }
  }

  console.log("Markdown 渲染验收通过：GFM、代码块、安全过滤、前台访问控制和管理员预览均正常。");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
