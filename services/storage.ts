import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig
} from "@aws-sdk/client-s3";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const allowedAudioTypes = new Map([
  ["audio/mpeg", "mp3"],
  ["audio/mp4", "m4a"],
  ["audio/x-m4a", "m4a"],
  ["audio/ogg", "ogg"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/flac", "flac"],
  ["audio/x-flac", "flac"]
]);

type ImageExtension = "jpg" | "png" | "webp";
type AudioExtension = "mp3" | "m4a" | "ogg" | "wav" | "flac";
type StorageKeyPrefix = "covers" | "audio";
type StorageProviderName = "local" | "s3" | "r2";

type ImageDimensions = { width: number; height: number };

export type StoredImage = ImageDimensions & {
  url: string;
  key: string;
  provider: StorageProviderName;
};

export type StoredAudio = {
  url: string;
  key: string;
  provider: StorageProviderName;
  contentType: string;
  size: number;
};

type SaveFileInput = {
  buffer: Buffer;
  contentType: string;
  extension: ImageExtension | AudioExtension;
  keyPrefix: StorageKeyPrefix;
};

type DeleteFileInput = { key: string };

export type StorageProvider = {
  name: StorageProviderName;
  saveFile(input: SaveFileInput): Promise<{ url: string; key: string; provider: StorageProviderName }>;
  deleteFile(input: DeleteFileInput): Promise<void>;
};

type ObjectStorageClient = {
  send(command: PutObjectCommand | DeleteObjectCommand): Promise<unknown>;
};

type StorageEnvironment = Record<string, string | undefined>;

const controlledImageKeyPattern = /^covers\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const controlledAudioKeyPattern = /^audio\/[0-9a-f-]{36}\.(mp3|m4a|ogg|wav|flac)$/;

function configuredProvider(): StorageProviderName {
  const provider = (process.env.STORAGE_PROVIDER || "local").trim().toLowerCase();
  if (provider === "local" || provider === "s3" || provider === "r2") return provider;
  throw new Error(`不支持的存储 Provider：${provider}`);
}

function localUploadRoot() {
  const configured = process.env.LOCAL_UPLOAD_DIR || process.env.UPLOAD_DIR || path.join("public", "uploads");
  const normalized = configured.replaceAll("/", path.sep);
  const publicUploads =
    !path.isAbsolute(normalized) && normalized !== "public" && !normalized.startsWith(`public${path.sep}`)
      ? path.join("public", normalized)
      : normalized;
  return path.isAbsolute(publicUploads) ? publicUploads : path.join(process.cwd(), publicUploads);
}

function publicBaseUrl() {
  return (process.env.LOCAL_UPLOAD_PUBLIC_BASE_URL || "/uploads").replace(/\/+$/, "");
}

function assertControlledKey(key: string, prefix: StorageKeyPrefix) {
  const matches = prefix === "covers" ? controlledImageKeyPattern.test(key) : controlledAudioKeyPattern.test(key);
  if (!matches) throw new Error(`${prefix === "covers" ? "图片" : "音频"}地址或对象 key 无效，不允许删除`);
  return key;
}

function resolveLocalPath(key: string, prefix: StorageKeyPrefix) {
  const controlledKey = assertControlledKey(key, prefix);
  const root = localUploadRoot();
  const resolved = path.resolve(root, ...controlledKey.split("/"));
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${prefix === "covers" ? "图片" : "音频"}地址或对象 key 无效，不允许删除`);
  }
  return resolved;
}

function keyFromUrl(url: string, provider: StorageProviderName, prefix: StorageKeyPrefix) {
  const base = provider === "local" ? publicBaseUrl() : requiredS3Config(provider).publicBaseUrl;
  let pathname = url;
  let basePath = base;
  if (!base.startsWith("/")) {
    try {
      const configuredBase = new URL(base);
      const requestedUrl = new URL(url);
      if (configuredBase.origin !== requestedUrl.origin) throw new Error();
      pathname = requestedUrl.pathname;
      basePath = configuredBase.pathname.replace(/\/+$/, "");
    } catch {
      throw new Error(`${prefix === "covers" ? "图片" : "音频"}地址无效或不允许删除`);
    }
  } else if (!url.startsWith("/")) {
    try {
      pathname = new URL(url).pathname;
    } catch {
      throw new Error(`${prefix === "covers" ? "图片" : "音频"}地址无效或不允许删除`);
    }
  }
  if (!pathname.startsWith(`${basePath}/`)) throw new Error(`${prefix === "covers" ? "图片" : "音频"}地址无效或不允许删除`);
  return assertControlledKey(decodeURIComponent(pathname.slice(basePath.length + 1)), prefix);
}

function objectKey(prefix: StorageKeyPrefix, extension: ImageExtension | AudioExtension) {
  return `${prefix}/${randomUUID()}.${extension}`;
}

export function createLocalStorageProvider(): StorageProvider {
  return {
    name: "local",
    async saveFile({ buffer, extension, keyPrefix }) {
      const key = objectKey(keyPrefix, extension);
      const destination = resolveLocalPath(key, keyPrefix);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, buffer);
      return { url: `${publicBaseUrl()}/${key}`, key, provider: "local" };
    },
    async deleteFile({ key }) {
      const prefix = key.startsWith("audio/") ? "audio" : "covers";
      await unlink(resolveLocalPath(key, prefix));
    }
  };
}

type S3StorageConfig = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
};

export function requiredS3Config(provider: "s3" | "r2", env: StorageEnvironment = process.env): S3StorageConfig {
  const values = {
    endpoint: env.S3_ENDPOINT?.trim() || "",
    region: env.S3_REGION?.trim() || "auto",
    bucket: env.S3_BUCKET?.trim() || "",
    accessKeyId: env.S3_ACCESS_KEY_ID?.trim() || "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY?.trim() || "",
    publicBaseUrl: env.S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") || ""
  };
  const requiredEntries = [
    ["S3_ENDPOINT", values.endpoint, provider === "r2"],
    ["S3_BUCKET", values.bucket, true],
    ["S3_ACCESS_KEY_ID", values.accessKeyId, true],
    ["S3_SECRET_ACCESS_KEY", values.secretAccessKey, true],
    ["S3_PUBLIC_BASE_URL", values.publicBaseUrl, true]
  ] as const;
  const missing = requiredEntries.filter(([, value, required]) => required && !value).map(([name]) => name);
  if (missing.length) {
    throw new Error(`${provider.toUpperCase()} 存储配置不完整：缺少 ${missing.join(", ")}`);
  }
  try {
    const endpoint = values.endpoint ? new URL(values.endpoint) : null;
    const publicBaseUrl = new URL(values.publicBaseUrl);
    if (!((!endpoint || ["http:", "https:"].includes(endpoint.protocol)) && ["http:", "https:"].includes(publicBaseUrl.protocol))) {
      throw new Error();
    }
  } catch {
    throw new Error("S3_ENDPOINT 和 S3_PUBLIC_BASE_URL 必须是有效的 http/https URL");
  }
  return { ...values, endpoint: values.endpoint || undefined, forcePathStyle: env.S3_FORCE_PATH_STYLE?.trim().toLowerCase() !== "false" };
}

export function createS3CompatibleStorageProvider(
  provider: "s3" | "r2",
  env: StorageEnvironment = process.env,
  injectedClient?: ObjectStorageClient
): StorageProvider {
  const config = requiredS3Config(provider, env);
  const clientConfig: S3ClientConfig = {
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  };
  const client = injectedClient || new S3Client(clientConfig);
  return {
    name: provider,
    async saveFile({ buffer, contentType, extension, keyPrefix }) {
      const key = objectKey(keyPrefix, extension);
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: buffer, ContentType: contentType }));
      return { url: `${config.publicBaseUrl}/${key}`, key, provider };
    },
    async deleteFile({ key }) {
      const prefix = key.startsWith("audio/") ? "audio" : "covers";
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: assertControlledKey(key, prefix) }));
    }
  };
}

export function storageProvider(): StorageProvider {
  const provider = configuredProvider();
  return provider === "local" ? createLocalStorageProvider() : createS3CompatibleStorageProvider(provider);
}

function parsePngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function parseJpegDimensions(buffer: Buffer): ImageDimensions | null {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function parseWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30) return null;
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (chunk === "VP8 " && buffer.length >= 30) return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function validateImage(file: File) {
  const maxMb = Number(process.env.MAX_UPLOAD_MB || 5);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`单张图片不能超过 ${maxMb}MB`);
  const extension = allowedTypes.get(file.type) as ImageExtension | undefined;
  if (!extension) throw new Error("仅支持 JPG、JPEG、PNG、WEBP 图片");
  return extension;
}

async function validatedImage(file: File) {
  const extension = validateImage(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const signatureOk =
    (extension === "jpg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (extension === "png" && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (extension === "webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP");
  if (!signatureOk) throw new Error("图片文件内容与类型不匹配");
  const dimensions = extension === "png" ? parsePngDimensions(buffer) : extension === "jpg" ? parseJpegDimensions(buffer) : parseWebpDimensions(buffer);
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) throw new Error("无法读取图片宽高");
  const maxWidth = Number(process.env.MAX_UPLOAD_WIDTH || 4096);
  const maxHeight = Number(process.env.MAX_UPLOAD_HEIGHT || 4096);
  if (dimensions.width > maxWidth || dimensions.height > maxHeight) throw new Error(`图片宽高不能超过 ${maxWidth}x${maxHeight}`);
  return { buffer, contentType: file.type, extension, dimensions };
}

export async function saveImage(file: File): Promise<StoredImage> {
  const image = await validatedImage(file);
  const stored = await storageProvider().saveFile({ ...image, keyPrefix: "covers" });
  return { ...stored, ...image.dimensions };
}

export async function deleteImage(input: string | { url?: string; key?: string; provider?: string }) {
  const selected = storageProvider();
  if (typeof input !== "string" && input.provider && input.provider !== selected.name) {
    throw new Error(`图片属于 ${input.provider} Provider，当前启用的是 ${selected.name}`);
  }
  const url = typeof input === "string" ? input : input.url;
  const key = typeof input === "string" ? keyFromUrl(input, selected.name, "covers") : input.key ? assertControlledKey(input.key, "covers") : url ? keyFromUrl(url, selected.name, "covers") : "";
  if (!key) throw new Error("缺少图片地址或对象 key");
  await selected.deleteFile({ key });
}

export async function saveLocalImage(file: File) {
  return (await saveImage(file)).url;
}

export async function deleteLocalImage(url: string) {
  await deleteImage(url);
}

function audioMaxBytes() {
  const configured = Number(process.env.MUSIC_AUDIO_MAX_BYTES);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 50 * 1024 * 1024;
}

function audioSignatureMatches(extension: AudioExtension, buffer: Buffer) {
  if (extension === "mp3") {
    return buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && [0xf2, 0xf3, 0xfb].includes(buffer[1] || 0));
  }
  if (extension === "m4a") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (extension === "ogg") return buffer.subarray(0, 4).toString("ascii") === "OggS";
  if (extension === "flac") return buffer.subarray(0, 4).toString("ascii") === "fLaC";
  return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE";
}

export async function saveAudio(file: File): Promise<StoredAudio> {
  const normalizedType = file.type.split(";")[0].trim().toLowerCase();
  const fileExt = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() || "" : "";

  let extension = allowedAudioTypes.get(normalizedType) as AudioExtension | undefined;

  if (!extension && normalizedType === "application/octet-stream" && fileExt === "flac") {
    extension = "flac";
  }

  if (extension === "flac" && fileExt !== "flac") {
    throw new Error("FLAC 音频文件扩展名必须为 .flac");
  }

  if (!extension) throw new Error("仅支持 MP3、M4A、OGG、WAV、FLAC 音频文件");

  const maxBytes = audioMaxBytes();
  if (file.size > maxBytes) throw new Error(`音频文件不能超过 ${Math.floor(maxBytes / 1024 / 1024)}MB`);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!audioSignatureMatches(extension, buffer)) throw new Error("音频文件内容与类型不匹配");
  const stored = await storageProvider().saveFile({ buffer, contentType: file.type, extension, keyPrefix: "audio" });
  return { ...stored, contentType: file.type, size: file.size };
}

export async function deleteAudio(input: string | { url?: string; key?: string; provider?: string }) {
  const selected = storageProvider();
  if (typeof input !== "string" && input.provider && input.provider !== selected.name) {
    throw new Error(`音频属于 ${input.provider} Provider，当前启用的是 ${selected.name}`);
  }
  const url = typeof input === "string" ? input : input.url;
  const key = typeof input === "string" ? keyFromUrl(input, selected.name, "audio") : input.key ? assertControlledKey(input.key, "audio") : url ? keyFromUrl(url, selected.name, "audio") : "";
  if (!key) throw new Error("缺少音频地址或对象 key");
  await selected.deleteFile({ key });
}
