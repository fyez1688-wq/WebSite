import fs from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { request } from "@playwright/test";
import { adminEmail, adminPassword, loadTestEnv } from "./helpers/env";
import { adminStorageStatePath } from "./helpers/auth-state";
import { loginApi } from "./helpers/http";

export default async function globalSetup(config: FullConfig) {
  loadTestEnv();
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ||
    config.projects[0]?.use.baseURL ||
    "http://localhost:3000";
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      origin: String(baseURL)
    }
  });
  try {
    await loginApi(api, adminEmail(), adminPassword());
    await fs.mkdir(path.dirname(adminStorageStatePath), { recursive: true });
    await api.storageState({ path: adminStorageStatePath });
  } finally {
    await api.dispose();
  }
}
