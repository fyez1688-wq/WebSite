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
  return headerValue
    .split(/,(?=\s*[^;,=]+=[^;,]+)/g)
    .map((value) => value.trim());
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
      if (index > 0)
        this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
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

async function registerUser(baseUrl, email, password) {
  const response = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password, nickname: "上传验收用户" })
  });
  if (![200, 409].includes(response.status)) {
    throw new Error(
      `普通用户注册失败：${response.status} ${await response.text()}`
    );
  }
}

async function login(baseUrl, account, password) {
  const jar = new CookieJar();
  const csrfResponse = await request(baseUrl, "/api/auth/csrf", {}, jar);
  if (csrfResponse.status !== 200)
    throw new Error(`获取 CSRF 失败：${csrfResponse.status}`);
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
  if (loginResponse.status !== 200)
    throw new Error(`登录失败：${account} ${loginResponse.status}`);
  return jar;
}

function pngBuffer(width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  return buffer;
}

async function upload(baseUrl, jar, buffer, type = "image/png") {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type }), "smoke.png");
  const response = await request(
    baseUrl,
    "/api/admin/uploads",
    { method: "POST", headers: { origin: baseUrl }, body: form },
    jar
  );
  return { response, body: await response.json().catch(() => null) };
}

async function deleteUpload(baseUrl, jar, url) {
  const response = await request(
    baseUrl,
    "/api/admin/uploads",
    {
      method: "DELETE",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ url })
    },
    jar
  );
  return { response, body: await response.json().catch(() => null) };
}

async function main() {
  loadEnv();
  const baseUrl = process.env.UPLOAD_SMOKE_BASE_URL || "http://localhost:3000";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const runId = Date.now().toString(36);
  const userEmail =
    process.env.UPLOAD_SMOKE_USER || `upload-smoke-${runId}@pzq1688.local`;
  const userPassword =
    process.env.UPLOAD_SMOKE_PASSWORD ||
    crypto.randomBytes(18).toString("base64url");

  if (!adminEmail || !adminPassword)
    throw new Error("缺少 ADMIN_EMAIL 或 ADMIN_PASSWORD");

  const guestUpload = await upload(baseUrl, null, pngBuffer(1, 1));
  if (guestUpload.response.status !== 401)
    throw new Error(`未登录上传应返回 401：${guestUpload.response.status}`);

  await registerUser(baseUrl, userEmail, userPassword);
  const userJar = await login(baseUrl, userEmail, userPassword);
  const userUpload = await upload(baseUrl, userJar, pngBuffer(1, 1));
  if (userUpload.response.status !== 403)
    throw new Error(`普通用户上传应返回 403：${userUpload.response.status}`);

  const adminJar = await login(baseUrl, adminEmail, adminPassword);

  const invalidDelete = await deleteUpload(
    baseUrl,
    adminJar,
    "/uploads/covers/../../.env"
  );
  if (
    invalidDelete.response.status !== 400 ||
    invalidDelete.body?.error?.code !== "DELETE_FAILED"
  ) {
    throw new Error(
      `非法删除路径应失败：${invalidDelete.response.status} ${JSON.stringify(invalidDelete.body)}`
    );
  }

  const masquerade = await upload(
    baseUrl,
    adminJar,
    Buffer.from("not an image")
  );
  if (
    masquerade.response.status !== 400 ||
    masquerade.body?.error?.code !== "UPLOAD_FAILED"
  ) {
    throw new Error(
      `伪装图片应上传失败：${masquerade.response.status} ${JSON.stringify(masquerade.body)}`
    );
  }

  const oversized = await upload(baseUrl, adminJar, pngBuffer(4097, 1));
  if (
    oversized.response.status !== 400 ||
    oversized.body?.error?.code !== "UPLOAD_FAILED"
  ) {
    throw new Error(
      `超宽图片应上传失败：${oversized.response.status} ${JSON.stringify(oversized.body)}`
    );
  }

  const uploaded = await upload(baseUrl, adminJar, pngBuffer(1, 1));
  if (uploaded.response.status !== 200)
    throw new Error(
      `管理员上传失败：${uploaded.response.status} ${JSON.stringify(uploaded.body)}`
    );
  const image = uploaded.body?.data;
  if (!image?.url || image.width !== 1 || image.height !== 1) {
    throw new Error(
      `上传响应缺少图片地址或宽高：${JSON.stringify(uploaded.body)}`
    );
  }

  const deleted = await deleteUpload(baseUrl, adminJar, image.url);
  if (deleted.response.status !== 200)
    throw new Error(
      `管理员删除上传图片失败：${deleted.response.status} ${JSON.stringify(deleted.body)}`
    );

  const deletedAgain = await deleteUpload(baseUrl, adminJar, image.url);
  if (
    deletedAgain.response.status !== 400 ||
    deletedAgain.body?.error?.code !== "DELETE_FAILED"
  ) {
    throw new Error(
      `重复删除应失败：${deletedAgain.response.status} ${JSON.stringify(deletedAgain.body)}`
    );
  }

  console.log(
    "上传验收通过：权限、伪装图片、宽高限制、上传、删除和非法删除路径均符合预期。"
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
