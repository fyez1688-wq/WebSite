import { NextResponse } from "next/server";

export type ApiSuccess<T> = { ok: true; data: T; message?: string };
export type ApiFailure = { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T, message?: string, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data, message }, init);
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json<ApiFailure>({ ok: false, error: { code, message } }, { status });
}
