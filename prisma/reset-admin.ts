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

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      nickname: adminName,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    },
    create: {
      email: adminEmail,
      nickname: adminName,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    }
  });

  if (adminEmail !== "admin") {
    const legacyAdmin = await prisma.user.findUnique({ where: { email: "admin" } });
    if (legacyAdmin) {
      await prisma.user.update({
        where: { id: legacyAdmin.id },
        data: { status: UserStatus.DISABLED }
      });
      console.log("已禁用旧的 admin 账号");
    }
  }

  console.log(`管理员账号已重置：${adminEmail}`);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
