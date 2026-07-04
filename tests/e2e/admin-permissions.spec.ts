import { expect, test } from "@playwright/test";
import { e2eUserEmail, e2eUserPassword, loadTestEnv } from "./helpers/env";
import { adminStorageStatePath } from "./helpers/auth-state";
import { loginBrowser, newApiContext, registerUser } from "./helpers/http";
import { runId } from "./helpers/data";

test.beforeAll(() => {
  loadTestEnv();
});

test("后台权限边界", async ({ browser, page, baseURL }) => {
  const id = runId();
  const api = await newApiContext(baseURL!);
  try {
    await registerUser(api, e2eUserEmail(id), e2eUserPassword(id));
  } finally {
    await api.dispose();
  }

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);

  const userContext = await browser.newContext();
  try {
    await loginBrowser(
      userContext,
      baseURL!,
      e2eUserEmail(id),
      e2eUserPassword(id)
    );
    const userPage = await userContext.newPage();
    await userPage.goto("/admin/content");
    await expect(userPage).toHaveURL(/\/403/);
  } finally {
    await userContext.close();
  }

  const adminContext = await browser.newContext({
    storageState: adminStorageStatePath
  });
  try {
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin");
    await expect(
      adminPage.getByRole("heading", { name: "数据概览" })
    ).toBeVisible();
    await adminPage.goto("/admin/content");
    await expect(
      adminPage.getByRole("heading", { name: "内容管理" })
    ).toBeVisible();
  } finally {
    await adminContext.close();
  }
});
