const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

function asUrl(baseUrl, location) {
  return new URL(location, baseUrl);
}

async function request(baseUrl, pathname, options = {}, jar) {
  const headers = new Headers(options.headers || {});
  if (jar && jar.header()) headers.set("cookie", jar.header());
  const response = await fetch(asUrl(baseUrl, pathname), {
    ...options,
    headers,
    redirect: options.redirect || "manual"
  });
  if (jar) jar.store(response);
  return response;
}

async function registerUser(baseUrl, email, password) {
  const response = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl
    },
    body: JSON.stringify({ email, password, nickname: "权限验收用户" })
  });
  if (![200, 409].includes(response.status)) {
    throw new Error(`普通用户注册失败，状态码 ${response.status}：${await response.text()}`);
  }
}

async function login(baseUrl, account, password) {
  const jar = new CookieJar();
  const csrfResponse = await request(baseUrl, "/api/auth/csrf", {}, jar);
  if (csrfResponse.status !== 200) {
    throw new Error(`获取 CSRF 失败，状态码 ${csrfResponse.status}`);
  }
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
  if (loginResponse.status !== 200) {
    throw new Error(`登录失败，账号 ${account}，状态码 ${loginResponse.status}`);
  }
  return jar;
}

function expectRedirect(response, baseUrl, pathname, label) {
  if (![302, 303, 307, 308].includes(response.status)) {
    throw new Error(`${label} 期望重定向，实际状态码 ${response.status}`);
  }
  const location = response.headers.get("location");
  if (!location) throw new Error(`${label} 缺少 Location 响应头`);
  const actualPath = asUrl(baseUrl, location).pathname;
  if (actualPath !== pathname) {
    throw new Error(`${label} 期望跳转到 ${pathname}，实际跳转到 ${actualPath}`);
  }
}

async function expectStatus(response, status, label) {
  if (response.status !== status) {
    throw new Error(`${label} 期望状态码 ${status}，实际状态码 ${response.status}`);
  }
}

async function main() {
  loadEnv();
  const baseUrl = process.env.PERMISSION_SMOKE_BASE_URL || "http://localhost:3000";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const runId = Date.now().toString(36);
  const userEmail = process.env.PERMISSION_SMOKE_USER || `permission-smoke-${runId}@pzq1688.local`;
  const userPassword = process.env.PERMISSION_SMOKE_PASSWORD || crypto.randomBytes(18).toString("base64url");

  if (!adminEmail || !adminPassword) {
    throw new Error("缺少 ADMIN_EMAIL 或 ADMIN_PASSWORD，无法执行权限验收");
  }

  await registerUser(baseUrl, userEmail, userPassword);

  const guestAdminPage = await request(baseUrl, "/admin");
  expectRedirect(guestAdminPage, baseUrl, "/login", "未登录访问后台页面");

  const guestAdminApi = await request(baseUrl, "/api/admin/contents");
  await expectStatus(guestAdminApi, 401, "未登录调用后台 API");

  const userJar = await login(baseUrl, userEmail, userPassword);
  const userAdminPage = await request(baseUrl, "/admin", {}, userJar);
  expectRedirect(userAdminPage, baseUrl, "/403", "普通用户访问后台页面");

  const userAdminApi = await request(baseUrl, "/api/admin/contents", {}, userJar);
  await expectStatus(userAdminApi, 403, "普通用户调用后台 API");

  const adminJar = await login(baseUrl, adminEmail, adminPassword);
  const adminPage = await request(baseUrl, "/admin", { redirect: "follow" }, adminJar);
  await expectStatus(adminPage, 200, "管理员访问后台页面");

  const adminApi = await request(baseUrl, "/api/admin/contents", {}, adminJar);
  await expectStatus(adminApi, 200, "管理员调用后台 API");

  console.log("后台权限验收通过：未登录跳登录，普通用户 403，管理员可访问。");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
