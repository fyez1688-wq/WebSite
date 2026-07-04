import { expect, test } from "@playwright/test";
import { loadTestEnv } from "./helpers/env";
import { adminStorageStatePath } from "./helpers/auth-state";
import {
  createCategory,
  createContent,
  e2eName,
  getContent,
  purgeContent,
  restoreContent,
  runId,
  softDeleteContent,
  updateContent
} from "./helpers/data";
import { newAdminApiContext } from "./helpers/http";

test.beforeAll(() => {
  loadTestEnv();
});

test("内容草稿、发布、下架、回收站和 Markdown 前台渲染", async ({
  browser,
  page,
  baseURL
}) => {
  const id = runId();
  const api = await newAdminApiContext(baseURL!);
  let categoryId = "";
  let contentId = "";
  let slug = "";

  try {
    const category = await createCategory(api, id, "CONTENT_CATEGORY");
    categoryId = category.id;
    const draft = await createContent(api, category.id, id, "CONTENT", "DRAFT");
    contentId = draft.id;
    slug = draft.slug;

    await page.goto(`/contents/${slug}`);
    await expect(page.getByText("页面不存在或内容不可访问")).toBeVisible();

    await updateContent(
      api,
      contentId,
      category.id,
      id,
      "CONTENT",
      "PUBLISHED"
    );
    await page.goto(`/contents/${slug}`);
    await expect(
      page.getByRole("heading", { name: e2eName(id, "CONTENT") })
    ).toBeVisible();
    await expect(page.locator(".markdown-table-wrap")).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2);
    await expect(page.getByText("const e2eValue")).toBeVisible();

    await updateContent(api, contentId, category.id, id, "CONTENT", "OFFLINE");
    await page.goto(`/contents/${slug}`);
    await expect(page.getByText("页面不存在或内容不可访问")).toBeVisible();

    await softDeleteContent(api, contentId);
    const adminContext = await browser.newContext({
      storageState: adminStorageStatePath
    });
    try {
      const adminPage = await adminContext.newPage();
      await adminPage.goto("/admin/content/trash");
      await expect(adminPage.getByText(e2eName(id, "CONTENT"))).toBeVisible();
    } finally {
      await adminContext.close();
    }

    await restoreContent(api, contentId);
    const restored = await getContent(api, contentId);
    expect(restored.deletedAt).toBeNull();
  } finally {
    if (contentId) {
      await softDeleteContent(api, contentId).catch(() => undefined);
      await purgeContent(api, contentId).catch(() => undefined);
    }
    if (categoryId) {
      await api
        .delete(`/api/admin/categories/${categoryId}`)
        .catch(() => undefined);
    }
    await api.dispose();
  }
});
