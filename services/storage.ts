import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

export async function saveLocalImage(file: File) {
  const maxMb = Number(process.env.MAX_UPLOAD_MB || 5);
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`单张图片不能超过 ${maxMb}MB`);
  }
  const ext = allowedTypes.get(file.type);
  if (!ext) throw new Error("仅支持 JPG、JPEG、PNG、WEBP 图片");

  const buffer = Buffer.from(await file.arrayBuffer());
  const signatureOk =
    (ext === "jpg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (ext === "png" && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (ext === "webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP");
  if (!signatureOk) throw new Error("图片文件内容与类型不匹配");

  const dir = path.join(process.cwd(), "public", "uploads", "covers");
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/covers/${filename}`;
}
