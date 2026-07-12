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

async function createTag(baseUrl, jar, name, slug) {
  const response = await request(
    baseUrl,
    "/api/admin/tags",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ name, slug, description: "标签合并验收", color: "#2563eb" })
    },
    jar
  );
  const body = await json(response);
  if (response.status !== 200) throw new Error(`创建标签失败：${response.status} ${JSON.stringify(body)}`);
  return body.data.item;
}

async function createContent(baseUrl, jar, categoryId, tagIds, title, slug) {
  const response = await request(
    baseUrl,
    "/api/admin/contents",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({
        title,
        slug,
        summary: "标签合并验收",
        content: "正文",
        contentType: "ARTICLE",
        status: "DRAFT",
        categoryId,
        tagIds,
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

async function deleteContent(baseUrl, jar, id) {
  await request(baseUrl, `/api/admin/contents/${id}`, { method: "DELETE", headers: { origin: baseUrl } }, jar);
}

async function deleteTag(baseUrl, jar, id) {
  await request(baseUrl, `/api/admin/tags/${id}`, { method: "DELETE", headers: { origin: baseUrl } }, jar);
}

async function getContent(baseUrl, jar, id) {
  const response = await request(baseUrl, `/api/admin/contents/${id}`, {}, jar);
  const body = await json(response);
  if (response.status !== 200) throw new Error(`读取内容失败：${response.status} ${JSON.stringify(body)}`);
  return body.data.content;
}

async function mergeTag(baseUrl, jar, sourceId, targetTagId) {
  const response = await request(
    baseUrl,
    `/api/admin/tags/${sourceId}/merge`,
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ targetTagId })
    },
    jar
  );
  return { response, body: await json(response) };
}

async function main() {
  loadEnv();
  const baseUrl = process.env.TAG_MERGE_SMOKE_BASE_URL || "http://localhost:3000";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("缺少 ADMIN_EMAIL 或 ADMIN_PASSWORD");

  const jar = await login(baseUrl, adminEmail, adminPassword);
  const categoriesResponse = await request(baseUrl, "/api/admin/categories", {}, jar);
  const categoriesBody = await json(categoriesResponse);
  if (categoriesResponse.status !== 200) throw new Error(`读取分类失败：${categoriesResponse.status}`);
  const category = categoriesBody.data.items.find((item) => item.isEnabled) || categoriesBody.data.items[0];
  if (!category) throw new Error("没有可用分类，无法创建标签合并测试内容");

  const runId = Date.now().toString(36);
  const source = await createTag(baseUrl, jar, `待合并标签 ${runId}`, `merge-source-${runId}`);
  const target = await createTag(baseUrl, jar, `目标标签 ${runId}`, `merge-target-${runId}`);
  const createdContents = [];

  try {
    const sourceOnly = await createContent(
      baseUrl,
      jar,
      category.id,
      [source.id],
      `标签合并源内容 ${runId}`,
      `tag-merge-source-${runId}`
    );
    createdContents.push(sourceOnly);
    const duplicated = await createContent(
      baseUrl,
      jar,
      category.id,
      [source.id, target.id],
      `标签合并重复内容 ${runId}`,
      `tag-merge-duplicated-${runId}`
    );
    createdContents.push(duplicated);

    const invalid = await mergeTag(baseUrl, jar, source.id, source.id);
    if (invalid.response.status !== 400 || invalid.body?.error?.code !== "INVALID_TARGET_TAG") {
      throw new Error(`合并到自身应失败：${invalid.response.status} ${JSON.stringify(invalid.body)}`);
    }

    const missingTarget = await mergeTag(baseUrl, jar, source.id, `missing-${runId}`);
    if (missingTarget.response.status !== 404 || missingTarget.body?.error?.code !== "TARGET_TAG_NOT_FOUND") {
      throw new Error(`合并到不存在标签应失败：${missingTarget.response.status} ${JSON.stringify(missingTarget.body)}`);
    }

    const merged = await mergeTag(baseUrl, jar, source.id, target.id);
    if (merged.response.status !== 200) {
      throw new Error(`标签合并失败：${merged.response.status} ${JSON.stringify(merged.body)}`);
    }
    if (merged.body?.data?.movedRelationCount !== 2) throw new Error("源标签关联统计不正确");
    if (merged.body?.data?.createdRelationCount !== 1) throw new Error("新建目标关联统计不正确");
    if (merged.body?.data?.skippedDuplicateRelationCount !== 1) throw new Error("重复关联跳过统计不正确");

    const sourceOnlyAfter = await getContent(baseUrl, jar, sourceOnly.id);
    const sourceOnlyTagIds = sourceOnlyAfter.tags.map((item) => item.tagId);
    if (!sourceOnlyTagIds.includes(target.id) || sourceOnlyTagIds.includes(source.id)) {
      throw new Error("仅源标签内容未正确迁移到目标标签");
    }

    const duplicatedAfter = await getContent(baseUrl, jar, duplicated.id);
    const duplicatedTargetCount = duplicatedAfter.tags.filter((item) => item.tagId === target.id).length;
    if (duplicatedTargetCount !== 1 || duplicatedAfter.tags.some((item) => item.tagId === source.id)) {
      throw new Error("重复标签内容迁移后关联不正确");
    }

    const tagsResponse = await request(baseUrl, "/api/admin/tags", {}, jar);
    const tagsBody = await json(tagsResponse);
    if (tagsBody.data.items.some((item) => item.id === source.id)) throw new Error("源标签仍然存在");
    if (!tagsBody.data.items.some((item) => item.id === target.id)) throw new Error("目标标签不存在");

    const repeated = await mergeTag(baseUrl, jar, source.id, target.id);
    if (repeated.response.status !== 404 || repeated.body?.error?.code !== "TAG_NOT_FOUND") {
      throw new Error(`重复合并已删除源标签应失败：${repeated.response.status} ${JSON.stringify(repeated.body)}`);
    }

    const logsResponse = await request(baseUrl, "/admin/logs", {}, jar);
    const logsHtml = await logsResponse.text();
    if (logsResponse.status !== 200 || !logsHtml.includes(`将标签 ${source.name} 合并到 ${target.name}`)) {
      throw new Error(`标签合并操作日志未找到：${logsResponse.status}`);
    }
  } finally {
    for (const item of createdContents) {
      if (item?.id) await deleteContent(baseUrl, jar, item.id).catch(() => undefined);
    }
    await deleteTag(baseUrl, jar, source.id).catch(() => undefined);
    await deleteTag(baseUrl, jar, target.id).catch(() => undefined);
  }

  console.log("标签合并验收通过：冲突提示正确，关联已迁移，重复关系已跳过，源标签已删除，操作日志已记录。");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
