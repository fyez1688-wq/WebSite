import { headers } from "next/headers";
import type { LogAction, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogInput = {
  actorId: string;
  action: LogAction;
  target: string;
  targetId?: string | null;
  targetTitle?: string | null;
  description?: string | null;
  detail?: string | null;
  tx?: PrismaClient | Prisma.TransactionClient;
};

export async function writeOperationLog(input: LogInput) {
  const h = await headers();
  const db = input.tx || prisma;
  return db.operationLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      target: input.target,
      targetId: input.targetId,
      targetTitle: input.targetTitle,
      description: input.description,
      detail: input.detail,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown",
      userAgent: h.get("user-agent")
    }
  });
}
