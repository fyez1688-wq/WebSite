import fs from "node:fs";
import path from "node:path";

export function loadTestEnv() {
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

export function requiredEnv(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`缺少环境变量 ${key}`);
  return value;
}

export function adminEmail() {
  return (
    process.env.E2E_ADMIN_EMAIL ||
    process.env.E2E_ADMIN_USERNAME ||
    requiredEnv("ADMIN_EMAIL")
  );
}

export function adminPassword() {
  return process.env.E2E_ADMIN_PASSWORD || requiredEnv("ADMIN_PASSWORD");
}

export function e2eUserEmail(runId: string) {
  return process.env.E2E_USER_EMAIL || `e2e-user-${runId}@pzq1688.local`;
}

export function e2eUserPassword(runId: string) {
  return process.env.E2E_USER_PASSWORD || `E2E_${runId}_Password_123!`;
}
