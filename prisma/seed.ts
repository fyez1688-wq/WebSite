import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function assertStrongAdminConfig(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const weakPasswords = new Set(["admin", "password", "123456", "12345678", "qwerty"]);

  if (normalizedEmail === "admin") {
    throw new Error("ADMIN_EMAIL 不能使用 admin，请改为真实邮箱或本地专用邮箱");
  }

  if (weakPasswords.has(password.trim().toLowerCase())) {
    throw new Error("ADMIN_PASSWORD 过弱，不能使用 admin、password、123456 等默认密码");
  }

  if (password.length < 16) {
    throw new Error("ADMIN_PASSWORD 至少需要 16 个字符");
  }
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "站点管理员";

  if (!adminEmail || !adminPassword) {
    throw new Error("请先配置 ADMIN_EMAIL 和 ADMIN_PASSWORD");
  }

  assertStrongAdminConfig(adminEmail, adminPassword);

  const exists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!exists) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        nickname: adminName,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: await bcrypt.hash(adminPassword, 12)
      }
    });
    console.log(`已创建初始管理员：${adminEmail}`);
  } else {
    console.log(`管理员已存在，跳过创建：${adminEmail}`);
  }

  if (adminEmail !== "admin") {
    const legacyAdmin = await prisma.user.findUnique({ where: { email: "admin" } });
    if (legacyAdmin) {
      await prisma.user.update({
        where: { id: legacyAdmin.id },
        data: { status: UserStatus.DISABLED }
      });
      console.log("已禁用旧的 admin 账号，请使用 ADMIN_EMAIL 配置的管理员登录");
    }
  }

  const categories = [
    { name: "学习资料", slug: "learning", description: "课程、文档、笔记与学习路线" },
    { name: "技术文章", slug: "articles", description: "开发、运维、安全和效率实践" },
    { name: "软件下载", slug: "software", description: "常用工具与软件资源" },
    { name: "资源收藏", slug: "resources", description: "值得长期保存的网站与资料" }
  ];

  for (const [index, item] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: item.slug },
      update: { ...item, sortOrder: index },
      create: { ...item, sortOrder: index }
    });
  }

  const tags = ["Next.js", "TypeScript", "PostgreSQL", "效率工具", "前端", "后端"];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { slug: name.toLowerCase().replace(".", "-") },
      update: { name },
      create: { name, slug: name.toLowerCase().replace(".", "-") }
    });
  }

  const learning = await prisma.category.findUniqueOrThrow({ where: { slug: "learning" } });
  const articleTag = await prisma.tag.findUniqueOrThrow({ where: { slug: "next-js" } });

  const content = await prisma.content.upsert({
    where: { slug: "welcome-to-fy-site" },
    update: {},
    create: {
      title: "欢迎来到 FY的小站",
      slug: "welcome-to-fy-site",
      summary: "这里会持续整理资源收藏、学习资料、技术文章和软件下载内容。",
      content:
        "FY的小站是一套可部署上线的资源型网站。管理员可以在后台维护内容、分类、标签、公告和轮播图，用户登录后可以跨设备同步收藏。",
      coverImage: "/images/default-cover.svg",
      status: "PUBLISHED",
      isFeatured: true,
      isPinned: true,
      categoryId: learning.id,
      publishedAt: new Date()
    }
  });

  await prisma.contentTag.upsert({
    where: { contentId_tagId: { contentId: content.id, tagId: articleTag.id } },
    update: {},
    create: { contentId: content.id, tagId: articleTag.id }
  });

  await prisma.banner.upsert({
    where: { id: "seed-banner-main" },
    update: {},
    create: {
      id: "seed-banner-main",
      title: "FY的小站",
      subtitle: "资源收藏、学习资料、技术文章、软件下载于一体",
      imageUrl: "/images/hero.svg",
      linkUrl: "/contents",
      sortOrder: 0
    }
  });

  await prisma.announcement.upsert({
    where: { id: "seed-announcement-main" },
    update: {},
    create: {
      id: "seed-announcement-main",
      title: "网站已上线",
      content: "首版框架已完成，后续内容会持续补充。",
      isActive: true
    }
  });

  const settings = [
    ["site_name", "FY的小站", "网站名称"],
    ["site_description", "资源收藏、学习资料、技术文章、软件下载于一体", "网站描述"],
    ["contact_email", adminEmail, "联系邮箱"]
  ];

  for (const [key, value, label] of settings) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value, label },
      create: { key, value, label }
    });
  }
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
