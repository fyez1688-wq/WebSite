import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { expect, request } from "@playwright/test";
import { adminStorageStatePath } from "./auth-state";

export async function newApiContext(baseURL: string) {
  return request.newContext({
    baseURL,
    extraHTTPHeaders: {
      origin: baseURL
    }
  });
}

export async function newAdminApiContext(baseURL: string) {
  return request.newContext({
    baseURL,
    storageState: adminStorageStatePath,
    extraHTTPHeaders: {
      origin: baseURL
    }
  });
}

export async function loginApi(
  api: APIRequestContext,
  account: string,
  password: string
) {
  const csrfResponse = await api.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const csrf = await csrfResponse.json();
  const loginResponse = await api.post(
    "/api/auth/callback/credentials?json=true",
    {
      form: {
        csrfToken: csrf.csrfToken,
        account,
        password,
        redirect: "false",
        callbackUrl: "/admin",
        json: "true"
      }
    }
  );
  expect(loginResponse.status(), `登录失败：${account}`).toBe(200);
}

export async function loginBrowser(
  context: BrowserContext,
  baseURL: string,
  account: string,
  password: string
) {
  const api = await newApiContext(baseURL);
  try {
    await loginApi(api, account, password);
    const cookies = await api.storageState();
    await context.addCookies(cookies.cookies);
  } finally {
    await api.dispose();
  }
}

export async function registerUser(
  api: APIRequestContext,
  email: string,
  password: string
) {
  const response = await api.post("/api/auth/register", {
    data: {
      email,
      password,
      nickname: "E2E_TEST_USER"
    }
  });
  expect([200, 409]).toContain(response.status());
}

export async function expectOk(response: { status(): number }, label: string) {
  expect(response.status(), label).toBe(200);
}
