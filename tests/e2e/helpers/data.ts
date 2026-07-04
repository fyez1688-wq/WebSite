import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
};

export type ContentItem = {
  id: string;
  title: string;
  slug: string;
  categoryId?: string | null;
};

export function runId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function e2eName(id: string, label: string) {
  return `E2E_TEST_${id}_${label}`.slice(0, 40);
}

export function e2eSlug(id: string, label: string) {
  return `e2e-test-${label}-${id}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

export async function createCategory(
  api: APIRequestContext,
  id: string,
  label: string
) {
  const response = await api.post("/api/admin/categories", {
    data: {
      name: e2eName(id, label),
      slug: e2eSlug(id, label),
      description: "E2E_TEST category",
      isEnabled: true,
      sortOrder: 9999
    }
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return body.data.item as CategoryItem;
}

export async function deleteCategory(
  api: APIRequestContext,
  id: string,
  moveToCategoryId?: string
) {
  await api.delete(`/api/admin/categories/${id}`, {
    data: moveToCategoryId ? { moveToCategoryId } : undefined
  });
}

export async function createContent(
  api: APIRequestContext,
  categoryId: string,
  id: string,
  label: string,
  status = "DRAFT"
) {
  const response = await api.post("/api/admin/contents", {
    data: contentPayload(categoryId, id, label, status)
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return body.data.content as ContentItem;
}

export async function updateContent(
  api: APIRequestContext,
  contentId: string,
  categoryId: string,
  id: string,
  label: string,
  status: string
) {
  const response = await api.patch(`/api/admin/contents/${contentId}`, {
    data: contentPayload(categoryId, id, label, status)
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return body.data.content as ContentItem;
}

export async function softDeleteContent(api: APIRequestContext, id: string) {
  const response = await api.delete(`/api/admin/contents/${id}`);
  expect([200, 404]).toContain(response.status());
}

export async function restoreContent(api: APIRequestContext, id: string) {
  const response = await api.post(`/api/admin/contents/${id}/restore`);
  expect([200, 404]).toContain(response.status());
}

export async function purgeContent(api: APIRequestContext, id: string) {
  const response = await api.delete(`/api/admin/contents/${id}/purge`);
  expect([200, 404]).toContain(response.status());
}

export async function getContent(api: APIRequestContext, id: string) {
  const response = await api.get(`/api/admin/contents/${id}`);
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return body.data.content;
}

export function markdownBody(id: string) {
  return [
    `# E2E_TEST Markdown ${id}`,
    "",
    "| 名称 | 值 |",
    "| --- | --- |",
    "| 表格 | 正常 |",
    "",
    "- [x] 已完成",
    "- [ ] 未完成",
    "",
    "```ts",
    "const e2eValue: string = 'ok';",
    "console.log(e2eValue);",
    "```"
  ].join("\n");
}

function contentPayload(
  categoryId: string,
  id: string,
  label: string,
  status: string
) {
  return {
    title: e2eName(id, label),
    slug: e2eSlug(id, label),
    summary: "E2E_TEST summary",
    content: markdownBody(id),
    contentType: "ARTICLE",
    categoryId,
    tagIds: [],
    status,
    isFeatured: false,
    isPinned: false,
    allowFavorite: true,
    sortOrder: 0
  };
}

export function pngBuffer(width = 1, height = 1) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  return buffer;
}
