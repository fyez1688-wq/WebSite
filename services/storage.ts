import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

type ImageExtension = "jpg" | "png" | "webp";

type ImageDimensions = {
  width: number;
  height: number;
};

type StoredImage = {
  url: string;
  width: number;
  height: number;
};

type StorageAdapter = {
  saveImage(file: File): Promise<StoredImage>;
  deleteImage(url: string): Promise<void>;
};

function uploadRoot() {
  const configured = process.env.UPLOAD_DIR || path.join("public", "uploads");
  const normalized = configured.replaceAll("/", path.sep);
  const publicUploads =
    !path.isAbsolute(normalized) &&
    normalized !== "public" &&
    !normalized.startsWith(`public${path.sep}`)
      ? path.join("public", normalized)
      : normalized;
  return path.join(
    path.isAbsolute(publicUploads)
      ? publicUploads
      : path.join(process.cwd(), publicUploads),
    "covers"
  );
}

function parsePngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function parseJpegDimensions(buffer: Buffer): ImageDimensions | null {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + length;
  }
  return null;
}

function parseWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30) return null;
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }
  return null;
}

function parseImageDimensions(buffer: Buffer, ext: ImageExtension) {
  if (ext === "png") return parsePngDimensions(buffer);
  if (ext === "jpg") return parseJpegDimensions(buffer);
  return parseWebpDimensions(buffer);
}

function ensureImageDimensions(buffer: Buffer, ext: ImageExtension) {
  const dimensions = parseImageDimensions(buffer, ext);
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
    throw new Error("无法读取图片宽高");
  }
  const maxWidth = Number(process.env.MAX_UPLOAD_WIDTH || 4096);
  const maxHeight = Number(process.env.MAX_UPLOAD_HEIGHT || 4096);
  if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
    throw new Error(`图片宽高不能超过 ${maxWidth}x${maxHeight}`);
  }
  return dimensions;
}

function resolveUploadUrl(url: string) {
  if (!/^\/uploads\/covers\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(url)) {
    throw new Error("图片地址无效或不允许删除");
  }
  const root = uploadRoot();
  const resolved = path.resolve(root, path.basename(url));
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("图片地址无效或不允许删除");
  }
  return resolved;
}

const localStorageAdapter: StorageAdapter = {
  async saveImage(file) {
    const maxMb = Number(process.env.MAX_UPLOAD_MB || 5);
    if (file.size > maxMb * 1024 * 1024) {
      throw new Error(`单张图片不能超过 ${maxMb}MB`);
    }
    const ext = allowedTypes.get(file.type) as ImageExtension | undefined;
    if (!ext) throw new Error("仅支持 JPG、JPEG、PNG、WEBP 图片");

    const buffer = Buffer.from(await file.arrayBuffer());
    const signatureOk =
      (ext === "jpg" &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff) ||
      (ext === "png" &&
        buffer
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
          )) ||
      (ext === "webp" &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP");
    if (!signatureOk) throw new Error("图片文件内容与类型不匹配");

    const dimensions = ensureImageDimensions(buffer, ext);
    const dir = uploadRoot();
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, filename), buffer);
    return { url: `/uploads/covers/${filename}`, ...dimensions };
  },

  async deleteImage(url) {
    await unlink(resolveUploadUrl(url));
  }
};

function storageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER || "local";
  if (provider !== "local") {
    throw new Error("当前仅启用本地上传存储");
  }
  return localStorageAdapter;
}

export async function saveImage(file: File) {
  return storageAdapter().saveImage(file);
}

export async function deleteImage(url: string) {
  return storageAdapter().deleteImage(url);
}

export async function saveLocalImage(file: File) {
  const result = await saveImage(file);
  return result.url;
}

export async function deleteLocalImage(url: string) {
  await deleteImage(url);
}
