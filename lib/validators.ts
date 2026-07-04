import { z } from "zod";

export const emailSchema = z.string().trim().email("请输入有效邮箱").max(120);
export const passwordSchema = z.string().min(8, "密码至少 8 位").max(72, "密码过长");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: z.string().trim().min(2, "昵称至少 2 个字符").max(30, "昵称过长")
});

export const loginSchema = z.object({
  account: z.string().trim().min(1, "请输入账号或邮箱").max(120),
  password: z.string().min(1, "请输入密码")
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "请输入分类名称").max(40),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "别名只能包含小写字母、数字和短横线").min(1).max(80),
  description: z.string().trim().max(160).optional().nullable(),
  icon: z.string().trim().max(80).optional().nullable(),
  isEnabled: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
});

export const tagSchema = z.object({
  name: z.string().trim().min(1, "请输入标签名称").max(40),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "别名只能包含小写字母、数字和短横线").min(1).max(80),
  description: z.string().trim().max(160).optional().nullable(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "颜色格式不正确").optional().nullable()
});

export const bannerSchema = z.object({
  title: z.string().trim().min(1, "请输入标题").max(80),
  subtitle: z.string().trim().max(160).optional().nullable(),
  imageUrl: z.string().trim().min(1, "请输入图片地址").max(500),
  linkUrl: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true)
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "请输入公告标题").max(80),
  content: z.string().trim().min(1, "请输入公告内容").max(500),
  isActive: z.boolean().default(true)
});

const blockedHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    if (blockedHostnames.has(hostname)) return false;
    if (
      /^10\./.test(hostname) ||
      /^127\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
      /^192\.168\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const optionalPublicUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .refine((value) => !value || isPublicHttpUrl(value), "URL 必须是可公开访问的 http/https 地址");

export const musicTrackSchema = z.object({
  title: z.string().trim().min(1, "歌曲标题不能为空").max(100, "歌曲标题不能超过100个字符"),
  artist: z.string().trim().max(100).optional().nullable(),
  album: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  coverImage: z.string().trim().max(500).optional().nullable(),
  audioUrl: z
    .string()
    .trim()
    .min(1, "音频 URL 不能为空")
    .max(500)
    .refine(isPublicHttpUrl, "音频 URL 必须是可公开访问的 http/https 地址"),
  sourceUrl: optionalPublicUrl,
  license: z.string().trim().max(300).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  duration: z.coerce.number().int().min(0).max(24 * 60 * 60).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999999).default(0),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false)
});

export const musicTrackUpdateSchema = z.object({
  title: z.string().trim().min(1, "歌曲标题不能为空").max(100, "歌曲标题不能超过100个字符").optional(),
  artist: z.string().trim().max(100).optional().nullable(),
  album: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  coverImage: z.string().trim().max(500).optional().nullable(),
  audioUrl: z
    .string()
    .trim()
    .min(1, "音频 URL 不能为空")
    .max(500)
    .refine(isPublicHttpUrl, "音频 URL 必须是可公开访问的 http/https 地址")
    .optional(),
  sourceUrl: optionalPublicUrl,
  license: z.string().trim().max(300).optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
  duration: z.coerce.number().int().min(0).max(24 * 60 * 60).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999999).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional()
});

export const adminUserSchema = z.object({
  nickname: z.string().trim().min(1).max(30).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "DELETED"]).optional()
});

export const contentInputSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(120, "标题不能超过120个字符"),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "slug只能包含小写字母、数字和短横线").min(2).max(140),
  summary: z.string().trim().max(500, "简介不能超过500个字符").default(""),
  content: z.string().trim().default(""),
  coverImage: z.string().trim().optional().nullable(),
  contentType: z
    .enum(["ARTICLE", "LEARNING_RESOURCE", "SOFTWARE", "WEBSITE", "DOWNLOAD", "OTHER"])
    .default("ARTICLE"),
  categoryId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "OFFLINE", "HIDDEN"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  allowFavorite: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999999).default(0),
  seoTitle: z.string().trim().max(120).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
  seoKeywords: z.string().trim().max(200).optional().nullable(),
  ogTitle: z.string().trim().max(120).optional().nullable(),
  ogDescription: z.string().trim().max(300).optional().nullable(),
  ogImage: z.string().trim().max(500).optional().nullable(),
  canonicalUrl: z.string().trim().max(500).optional().nullable(),
  resourceDetail: z
    .object({
      softwareName: z.string().trim().max(100).optional().nullable(),
      softwareVersion: z.string().trim().max(80).optional().nullable(),
      supportedSystems: z.string().trim().max(160).optional().nullable(),
      fileSize: z.string().trim().max(80).optional().nullable(),
      officialUrl: z.string().trim().url("官网地址格式不正确").optional().or(z.literal("")).nullable(),
      downloadUrl: z.string().trim().url("下载地址格式不正确").optional().or(z.literal("")).nullable(),
      extractionCode: z.string().trim().max(80).optional().nullable(),
      installGuide: z.string().trim().max(2000).optional().nullable(),
      requireLoginToDownload: z.boolean().default(false),
      showDownloadCount: z.boolean().default(true)
    })
    .optional()
    .nullable(),
  lastUpdatedAt: z.string().datetime().optional()
});

export const contentDraftSchema = contentInputSchema.partial().extend({
  title: z.string().trim().min(1).max(120).default("未命名草稿"),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(140).optional()
});

export const contentBatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(["PUBLISH", "OFFLINE", "DELETE", "FEATURE", "UNFEATURE", "PIN", "UNPIN", "MOVE_CATEGORY"]),
  categoryId: z.string().optional().nullable()
});

export const profileSchema = z.object({
  nickname: z.string().trim().min(2).max(30),
  avatar: z.string().trim().url().optional().or(z.literal(""))
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema
});
