import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  createLocalStorageProvider,
  createS3CompatibleStorageProvider,
  requiredS3Config
} from "../services/storage";

async function testLocalProvider() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "fy-storage-"));
  const previousDirectory = process.env.LOCAL_UPLOAD_DIR;
  const previousBaseUrl = process.env.LOCAL_UPLOAD_PUBLIC_BASE_URL;
  process.env.LOCAL_UPLOAD_DIR = directory;
  process.env.LOCAL_UPLOAD_PUBLIC_BASE_URL = "/uploads";
  try {
    const provider = createLocalStorageProvider();
    const buffer = Buffer.from("local-provider-test");
    const stored = await provider.saveFile({ buffer, contentType: "image/png", extension: "png", keyPrefix: "covers" });
    assert.equal(stored.provider, "local");
    assert.match(stored.key, /^covers\/[0-9a-f-]{36}\.png$/);
    assert.equal(stored.url, `/uploads/${stored.key}`);
    assert.deepEqual(await readFile(path.join(directory, ...stored.key.split("/"))), buffer);
    await provider.deleteFile({ key: stored.key });
    const audio = await provider.saveFile({ buffer: Buffer.from("mock-wav"), contentType: "audio/wav", extension: "wav", keyPrefix: "audio" });
    assert.match(audio.key, /^audio\/[0-9a-f-]{36}\.wav$/);
    assert.equal(audio.url, `/uploads/${audio.key}`);
    assert.deepEqual(await readFile(path.join(directory, ...audio.key.split("/"))), Buffer.from("mock-wav"));
    await provider.deleteFile({ key: audio.key });
    const flac = await provider.saveFile({ buffer: Buffer.from("fLaC-stub"), contentType: "audio/flac", extension: "flac", keyPrefix: "audio" });
    assert.match(flac.key, /^audio\/[0-9a-f-]{36}\.flac$/);
    assert.equal(flac.url, `/uploads/${flac.key}`);
    await provider.deleteFile({ key: flac.key });
    await assert.rejects(() => provider.deleteFile({ key: "covers/../../.env" }), /不允许删除/);
  } finally {
    if (previousDirectory === undefined) delete process.env.LOCAL_UPLOAD_DIR;
    else process.env.LOCAL_UPLOAD_DIR = previousDirectory;
    if (previousBaseUrl === undefined) delete process.env.LOCAL_UPLOAD_PUBLIC_BASE_URL;
    else process.env.LOCAL_UPLOAD_PUBLIC_BASE_URL = previousBaseUrl;
    await rm(directory, { recursive: true, force: true });
  }
}

async function testS3Configuration() {
  assert.throws(
    () => requiredS3Config("r2", { S3_REGION: "auto" }),
    /R2 存储配置不完整：缺少 S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL/
  );
}

async function testMockS3Provider() {
  const commands: Array<PutObjectCommand | DeleteObjectCommand> = [];
  const client = { async send(command: PutObjectCommand | DeleteObjectCommand) { commands.push(command); return {}; } };
  const env = {
    S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
    S3_REGION: "auto",
    S3_BUCKET: "test-bucket",
    S3_ACCESS_KEY_ID: "fake-access-key",
    S3_SECRET_ACCESS_KEY: "fake-secret-key",
    S3_PUBLIC_BASE_URL: "https://cdn.example.com/uploads",
    S3_FORCE_PATH_STYLE: "true"
  };
  const provider = createS3CompatibleStorageProvider("r2", env, client);
  const stored = await provider.saveFile({ buffer: Buffer.from("mock-image"), contentType: "image/webp", extension: "webp", keyPrefix: "covers" });
  assert.equal(stored.provider, "r2");
  assert.equal(stored.url, `https://cdn.example.com/uploads/${stored.key}`);
  assert.ok(commands[0] instanceof PutObjectCommand);
  assert.equal(commands[0].input.Bucket, "test-bucket");
  assert.equal(commands[0].input.Key, stored.key);
  assert.equal(commands[0].input.ContentType, "image/webp");
  await assert.rejects(() => provider.deleteFile({ key: "other-system/file.webp" }), /不允许删除/);
  await provider.deleteFile({ key: stored.key });
  assert.ok(commands[1] instanceof DeleteObjectCommand);
  assert.equal(commands[1].input.Key, stored.key);
  const audio = await provider.saveFile({ buffer: Buffer.from("mock-wav"), contentType: "audio/wav", extension: "wav", keyPrefix: "audio" });
  assert.match(audio.key, /^audio\/[0-9a-f-]{36}\.wav$/);
  const audioUpload = commands[2];
  assert.ok(audioUpload instanceof PutObjectCommand);
  if (!(audioUpload instanceof PutObjectCommand)) throw new Error("mock R2 音频上传命令错误");
  assert.equal(audioUpload.input.ContentType, "audio/wav");
  await provider.deleteFile({ key: audio.key });
  assert.equal(commands[3].input.Key, audio.key);
  const flac = await provider.saveFile({ buffer: Buffer.from("fLaC-stub"), contentType: "audio/flac", extension: "flac", keyPrefix: "audio" });
  assert.match(flac.key, /^audio\/[0-9a-f-]{36}\.flac$/);
  const flacUpload = commands[4];
  assert.ok(flacUpload instanceof PutObjectCommand);
  if (!(flacUpload instanceof PutObjectCommand)) throw new Error("mock R2 FLAC 上传命令错误");
  assert.equal(flacUpload.input.ContentType, "audio/flac");
  await provider.deleteFile({ key: flac.key });
  assert.equal(commands[5].input.Key, flac.key);
}

async function main() {
  await testLocalProvider();
  await testS3Configuration();
  await testMockS3Provider();
  console.log("存储 Provider 验收通过：local 行为、配置错误、mock R2/S3 上传删除和受控 key 均符合预期。");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
