import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const logs = await prisma.operationLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return <div className="admin-panel"><h2 className="text-2xl font-semibold">操作日志</h2><div className="mt-4 grid gap-2">{logs.map((log) => <div className="border-b border-[var(--border)] py-3 text-sm" key={log.id}><div>{log.actor?.email || "系统"} {log.action} {log.targetTitle || log.target}</div><div className="muted">{log.description || log.detail || "-"} · {log.ip || "unknown"} · {log.createdAt.toLocaleString("zh-CN")}</div></div>)}</div></div>;
}
