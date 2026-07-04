import { expect, test } from "@playwright/test";
import { e2eUserEmail, e2eUserPassword, loadTestEnv } from "./helpers/env";
import {
  createCategory,
  createContent,
  getContent,
  pngBuffer,
  purgeContent,
  runId,
  softDeleteContent
} from "./helpers/data";
import {
  loginApi,
  newAdminApiContext,
  newApiContext,
  registerUser
} from "./helpers/http";

test.beforeAll(() => {
  loadTestEnv();
});

test("上传权限、合法图片和伪装文件", async ({ baseURL }) => {
  const id = runId();
  const adminApi = await newAdminApiContext(baseURL!);
  const userApi = await newApiContext(baseURL!);
  let uploadedUrl = "";

  try {
    await registerUser(userApi, e2eUserEmail(id), e2eUserPassword(id));
    await loginApi(userApi, e2eUserEmail(id), e2eUserPassword(id));

    const userUpload = await userApi.post("/api/admin/uploads", {
      multipart: {
        file: {
          name: "e2e.png",
          mimeType: "image/png",
          buffer: pngBuffer()
        }
      }
    });
    expect(userUpload.status()).toBe(403);

    const masquerade = await adminApi.post("/api/admin/uploads", {
      multipart: {
        file: {
          name: "fake.png",
          mimeType: "image/png",
          buffer: Buffer.from("not an image")
        }
      }
    });
    expect(masquerade.status()).toBe(400);

    const uploaded = await adminApi.post("/api/admin/uploads", {
      multipart: {
        file: {
          name: "e2e.png",
          mimeType: "image/png",
          buffer: pngBuffer()
        }
      }
    });
    expect(uploaded.status(), await uploaded.text()).toBe(200);
    const body = await uploaded.json();
    uploadedUrl = body.data.url;
    expect(body.data.width).toBe(1);
    expect(body.data.height).toBe(1);
  } finally {
    if (uploadedUrl) {
      await adminApi
        .delete("/api/admin/uploads", { data: { url: uploadedUrl } })
        .catch(() => undefined);
    }
    await adminApi.dispose();
    await userApi.dispose();
  }
});

test("分类移动后删除会迁移内容分类", async ({ baseURL }) => {
  const id = runId();
  const api = await newAdminApiContext(baseURL!);
  let sourceId = "";
  let targetId = "";
  let contentId = "";

  try {
    const source = await createCategory(api, id, "SOURCE_CATEGORY");
    const target = await createCategory(api, id, "TARGET_CATEGORY");
    sourceId = source.id;
    targetId = target.id;
    const content = await createContent(
      api,
      source.id,
      id,
      "CATEGORY_CONTENT",
      "DRAFT"
    );
    contentId = content.id;

    const directDelete = await api.delete(`/api/admin/categories/${source.id}`);
    expect(directDelete.status()).toBe(400);
    const directBody = await directDelete.json();
    expect(directBody.error.code).toBe("CATEGORY_IN_USE");

    const movedDelete = await api.delete(`/api/admin/categories/${source.id}`, {
      data: { moveToCategoryId: target.id }
    });
    expect(movedDelete.status(), await movedDelete.text()).toBe(200);

    const movedContent = await getContent(api, content.id);
    expect(movedContent.categoryId).toBe(target.id);
    sourceId = "";
  } finally {
    if (contentId) {
      await softDeleteContent(api, contentId).catch(() => undefined);
      await purgeContent(api, contentId).catch(() => undefined);
    }
    if (sourceId)
      await api
        .delete(`/api/admin/categories/${sourceId}`)
        .catch(() => undefined);
    if (targetId)
      await api
        .delete(`/api/admin/categories/${targetId}`)
        .catch(() => undefined);
    await api.dispose();
  }
});
