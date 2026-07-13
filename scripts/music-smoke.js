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

function publicUrl(baseUrl, url) {
  return new URL(url, process.env.NEXT_PUBLIC_SITE_URL || baseUrl).toString();
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

function wavBuffer() {
  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36, 4);
  buffer.write("WAVEfmt ", 8, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8_000, 24);
  buffer.writeUInt32LE(16_000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  return buffer;
}

function flacBuffer() {
  const buffer = Buffer.alloc(42);
  buffer.write("fLaC", 0, "ascii");
  buffer.writeUInt8(0x80, 4);
  buffer.writeUIntBE(0, 5, 3);
  buffer.writeUInt8(0x00, 8);
  buffer.writeUIntBE(44100, 10, 3);
  buffer.writeUInt8(0x08, 18);
  buffer.writeUIntBE(0, 22, 3);
  buffer.writeUIntBE(0, 36, 3);
  buffer.writeUIntBE(960, 40, 2);
  return buffer;
}

async function uploadAudio(baseUrl, jar, buffer, type = "audio/wav", filename = "smoke.wav") {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type }), filename);
  const response = await request(
    baseUrl,
    "/api/admin/music/upload-audio",
    { method: "POST", headers: { origin: baseUrl }, body: form },
    jar
  );
  return { response, body: await response.json().catch(() => null) };
}

async function deleteAudio(baseUrl, jar, url) {
  return jsonRequest(
    baseUrl,
    "/api/admin/music/upload-audio",
    { method: "DELETE", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ url }) },
    jar
  );
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

  const guestAudio = await uploadAudio(baseUrl, null, wavBuffer());
  if (guestAudio.response.status !== 401) throw new Error(`未登录上传音频应返回 401：${guestAudio.response.status}`);

  const userAudio = await uploadAudio(baseUrl, userJar, wavBuffer());
  if (userAudio.response.status !== 403) throw new Error(`普通用户上传音频应返回 403：${userAudio.response.status}`);

  const masqueradeAudio = await uploadAudio(baseUrl, adminJar, Buffer.from("not audio"));
  if (masqueradeAudio.response.status !== 400 || masqueradeAudio.body?.error?.code !== "AUDIO_UPLOAD_FAILED") {
    throw new Error(`伪装音频应上传失败：${masqueradeAudio.response.status} ${JSON.stringify(masqueradeAudio.body)}`);
  }

  const masqueradeFlac = await uploadAudio(baseUrl, adminJar, Buffer.from("not flac"), "audio/flac", "smoke.flac");
  if (masqueradeFlac.response.status !== 400 || masqueradeFlac.body?.error?.code !== "AUDIO_UPLOAD_FAILED") {
    throw new Error(`伪装 FLAC 应上传失败：${masqueradeFlac.response.status} ${JSON.stringify(masqueradeFlac.body)}`);
  }

  const fakeFlacContentWrongMime = await uploadAudio(baseUrl, adminJar, flacBuffer(), "audio/flac", "smoke.mp3");
  if (fakeFlacContentWrongMime.response.status !== 400) {
    throw new Error(`FLAC 内容 + .mp3 文件名应被拒绝：${fakeFlacContentWrongMime.response.status} ${JSON.stringify(fakeFlacContentWrongMime.body)}`);
  }

  const octetStreamWrongExt = await uploadAudio(baseUrl, adminJar, flacBuffer(), "application/octet-stream", "smoke.txt");
  if (octetStreamWrongExt.response.status !== 400) {
    throw new Error(`application/octet-stream + .txt 应被拒绝：${octetStreamWrongExt.response.status} ${JSON.stringify(octetStreamWrongExt.body)}`);
  }

  const octetStreamMp3Ext = await uploadAudio(baseUrl, adminJar, flacBuffer(), "application/octet-stream", "smoke.mp3");
  if (octetStreamMp3Ext.response.status !== 400) {
    throw new Error(`application/octet-stream + .mp3 应被拒绝：${octetStreamMp3Ext.response.status} ${JSON.stringify(octetStreamMp3Ext.body)}`);
  }

  const uploadedFlac = await uploadAudio(baseUrl, adminJar, flacBuffer(), "audio/flac", "smoke.flac");
  const flac = uploadedFlac.body?.data;
  if (uploadedFlac.response.status !== 200 || !flac?.url || !["local", "s3", "r2"].includes(flac.provider) || !/^audio\/[0-9a-f-]{36}\.flac$/.test(flac.key || "") || flac.contentType !== "audio/flac" || flac.size !== 42) {
    throw new Error(`FLAC 上传响应不完整：${uploadedFlac.response.status} ${JSON.stringify(uploadedFlac.body)}`);
  }

  const uploadedXFlac = await uploadAudio(baseUrl, adminJar, flacBuffer(), "audio/x-flac", "smoke.flac");
  const xFlac = uploadedXFlac.body?.data;
  if (uploadedXFlac.response.status !== 200 || !xFlac?.url || !/^audio\/[0-9a-f-]{36}\.flac$/.test(xFlac.key || "") || xFlac.contentType !== "audio/x-flac") {
    throw new Error(`audio/x-flac 上传应通过：${uploadedXFlac.response.status} ${JSON.stringify(uploadedXFlac.body)}`);
  }

  const uploadedOctetStream = await uploadAudio(baseUrl, adminJar, flacBuffer(), "application/octet-stream", "smoke.flac");
  const octetFlac = uploadedOctetStream.body?.data;
  if (uploadedOctetStream.response.status !== 200 || !octetFlac?.url || !/^audio\/[0-9a-f-]{36}\.flac$/.test(octetFlac.key || "") || octetFlac.contentType !== "application/octet-stream") {
    throw new Error(`application/octet-stream + .flac + fLaC 上传应通过：${uploadedOctetStream.response.status} ${JSON.stringify(uploadedOctetStream.body)}`);
  }

  const deletedFlac = await deleteAudio(baseUrl, adminJar, flac.url);
  if (deletedFlac.response.status !== 200) {
    throw new Error(`管理员删除 FLAC 上传音频失败：${deletedFlac.response.status} ${JSON.stringify(deletedFlac.body)}`);
  }

  await deleteAudio(baseUrl, adminJar, xFlac.url);
  await deleteAudio(baseUrl, adminJar, octetFlac.url);

  const uploadedAudio = await uploadAudio(baseUrl, adminJar, wavBuffer());
  const audio = uploadedAudio.body?.data;
  if (uploadedAudio.response.status !== 200 || !audio?.url || !["local", "s3", "r2"].includes(audio.provider) || !/^audio\/[0-9a-f-]{36}\.wav$/.test(audio.key || "") || audio.contentType !== "audio/wav" || audio.size !== 44) {
    throw new Error(`音频上传响应不完整：${uploadedAudio.response.status} ${JSON.stringify(uploadedAudio.body)}`);
  }

  const linkCheckAsUser = await jsonRequest(
    baseUrl,
    "/api/admin/music/check-audio-url",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ audioUrl: "https://example.com/audio.mp3" })
    },
    userJar
  );
  if (linkCheckAsUser.response.status !== 403) {
    throw new Error(`普通用户检测音频链接应返回 403：${linkCheckAsUser.response.status}`);
  }

  const privateLinkCheck = await jsonRequest(
    baseUrl,
    "/api/admin/music/check-audio-url",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ audioUrl: "http://127.0.0.1/audio.mp3" })
    },
    adminJar
  );
  if (privateLinkCheck.response.status !== 400 || privateLinkCheck.body?.error?.code !== "VALIDATION_ERROR") {
    throw new Error(`私网音频 URL 检测应被拒绝：${privateLinkCheck.response.status} ${JSON.stringify(privateLinkCheck.body)}`);
  }

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

  const managedAudioUrl = publicUrl(baseUrl, audio.url);
  const managed = await jsonRequest(
    baseUrl,
    "/api/admin/music",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify(trackPayload(`${runId}_managed`, { audioUrl: managedAudioUrl, isPublished: false }))
    },
    adminJar
  );
  const managedId = managed.body?.data?.item?.id;
  if (managed.response.status !== 200 || !managedId) throw new Error(`创建受控音频音乐失败：${managed.response.status} ${JSON.stringify(managed.body)}`);

  const managedDeleted = await jsonRequest(
    baseUrl,
    `/api/admin/music/${managedId}`,
    { method: "DELETE", headers: { origin: baseUrl } },
    adminJar
  );
  if (managedDeleted.response.status !== 200 || managedDeleted.body?.data?.audioCleanup !== "deleted") {
    throw new Error(`删除歌曲时应同步清理受控音频：${managedDeleted.response.status} ${JSON.stringify(managedDeleted.body)}`);
  }
  const deletedManagedAudio = await deleteAudio(baseUrl, adminJar, managedAudioUrl);
  const expectedRepeatDeleteStatus = audio.provider === "local" ? 400 : 200;
  if (deletedManagedAudio.response.status !== expectedRepeatDeleteStatus) {
    throw new Error(`受控音频同步删除后状态不符合 Provider 语义：${deletedManagedAudio.response.status} ${JSON.stringify(deletedManagedAudio.body)}`);
  }

  const sharedUpload = await uploadAudio(baseUrl, adminJar, wavBuffer());
  const sharedAudio = sharedUpload.body?.data;
  if (sharedUpload.response.status !== 200 || !sharedAudio?.url) throw new Error(`共享音频上传失败：${sharedUpload.response.status} ${JSON.stringify(sharedUpload.body)}`);
  const sharedAudioUrl = publicUrl(baseUrl, sharedAudio.url);
  const sharedOne = await jsonRequest(baseUrl, "/api/admin/music", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify(trackPayload(`${runId}_shared_one`, { audioUrl: sharedAudioUrl, isPublished: false }))
  }, adminJar);
  const sharedTwo = await jsonRequest(baseUrl, "/api/admin/music", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify(trackPayload(`${runId}_shared_two`, { audioUrl: sharedAudioUrl, isPublished: false }))
  }, adminJar);
  const sharedOneId = sharedOne.body?.data?.item?.id;
  const sharedTwoId = sharedTwo.body?.data?.item?.id;
  if (sharedOne.response.status !== 200 || sharedTwo.response.status !== 200 || !sharedOneId || !sharedTwoId) {
    throw new Error(`创建共享音频歌曲失败：${sharedOne.response.status}/${sharedTwo.response.status}`);
  }
  const sharedFirstDelete = await jsonRequest(baseUrl, `/api/admin/music/${sharedOneId}`, { method: "DELETE", headers: { origin: baseUrl } }, adminJar);
  if (sharedFirstDelete.response.status !== 200 || sharedFirstDelete.body?.data?.audioCleanup !== "retained") {
    throw new Error(`仍被引用的音频不应删除：${sharedFirstDelete.response.status} ${JSON.stringify(sharedFirstDelete.body)}`);
  }
  const sharedLastDelete = await jsonRequest(baseUrl, `/api/admin/music/${sharedTwoId}`, { method: "DELETE", headers: { origin: baseUrl } }, adminJar);
  if (sharedLastDelete.response.status !== 200 || sharedLastDelete.body?.data?.audioCleanup !== "deleted") {
    throw new Error(`最后一个引用删除时应清理音频：${sharedLastDelete.response.status} ${JSON.stringify(sharedLastDelete.body)}`);
  }

  const coverUrl = managedAudioUrl.replace(/\/audio\/[^/]+$/, "/covers/00000000-0000-4000-8000-000000000000.jpg");
  if (coverUrl === managedAudioUrl) throw new Error("无法构造受控 covers 地址测试用例");
  const coverAsAudio = await jsonRequest(baseUrl, "/api/admin/music", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify(trackPayload(`${runId}_cover`, { audioUrl: coverUrl, isPublished: false }))
  }, adminJar);
  const coverTrackId = coverAsAudio.body?.data?.item?.id;
  if (coverAsAudio.response.status !== 200 || !coverTrackId) throw new Error(`创建 covers 地址歌曲失败：${coverAsAudio.response.status}`);
  const coverDelete = await jsonRequest(baseUrl, `/api/admin/music/${coverTrackId}`, { method: "DELETE", headers: { origin: baseUrl } }, adminJar);
  if (coverDelete.response.status !== 200 || coverDelete.body?.data?.audioCleanup !== "external") {
    throw new Error(`covers 地址不能作为受控音频删除：${coverDelete.response.status} ${JSON.stringify(coverDelete.body)}`);
  }
  const protectedCoverDelete = await deleteAudio(baseUrl, adminJar, coverUrl);
  if (protectedCoverDelete.response.status !== 400) throw new Error(`音频删除接口不得删除 covers：${protectedCoverDelete.response.status}`);

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

  const userDelete = await jsonRequest(
    baseUrl,
    `/api/admin/music/${publishedId}`,
    { method: "DELETE", headers: { origin: baseUrl } },
    userJar
  );
  if (userDelete.response.status !== 403) throw new Error(`普通用户删除音乐应返回 403：${userDelete.response.status}`);

  const deleted = await jsonRequest(
    baseUrl,
    `/api/admin/music/${publishedId}`,
    { method: "DELETE", headers: { origin: baseUrl } },
    adminJar
  );
  if (deleted.response.status !== 200 || deleted.body?.data?.item?.deletedAt === null || deleted.body?.data?.audioCleanup !== "external") {
    throw new Error(`管理员软删除音乐失败：${deleted.response.status} ${JSON.stringify(deleted.body)}`);
  }

  await jsonRequest(baseUrl, `/api/admin/music/${hiddenId}`, { method: "DELETE", headers: { origin: baseUrl } }, adminJar);

  const afterDelete = await jsonRequest(baseUrl, `/api/music?q=${encodeURIComponent(runId)}`);
  if ((afterDelete.body?.data?.items || []).some((item) => item.id === publishedId)) {
    throw new Error("软删除音乐不应继续出现在前台接口");
  }

  console.log("音乐模块验收通过：公开读取、发布过滤、后台权限、音频上传/删除、增改软删、非法 URL、音频链接检测 SSRF 防护、推荐接口和播放量防刷均符合预期。");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
