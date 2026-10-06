import type { HookContext } from "@w6w/types";

/**
 * Thin client for the Mural public API.
 *
 * Verified on 2026-10-06 against Mural's own API reference (the OpenAPI 3.1
 * document embedded in each `developers.mural.co/public/reference/*.md` page).
 *
 *  1. **Every success body is wrapped** in `{ value }`; lists add `next`, an opaque,
 *     expiring page token (`NEXT_TOKEN_EXPIRED`). {@link list} returns
 *     `{ items, next }`, {@link one} the unwrapped object.
 *  2. **Errors are `{ code, message }`** (`UNAUTHORIZED`, `TOKEN_EXPIRED`,
 *     `MURAL_NOT_FOUND`, `LIMIT_INVALID`, ...). The code is what callers should read.
 *  3. **Widget creates take and return arrays**; {@link first} unwraps one.
 */
export const API_BASE = "https://app.mural.co/api/public/v1";

export class MuralError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super(message);
    this.name = "MuralError";
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Trim and URL-encode a path segment; an empty id would silently hit the list route. */
export function encodeId(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("A required ID was empty");
  return encodeURIComponent(s);
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** Mural's error body: `{ code, message }`. */
export function errorParts(body: unknown): { code?: string; message?: string } {
  const b = body as { code?: unknown; message?: unknown } | null;
  return {
    code: typeof b?.code === "string" ? b.code : undefined,
    message: typeof b?.message === "string" ? b.message : undefined,
  };
}

/**
 * Drop `undefined`/`null`/empty-string inputs so an unset form field is never sent
 * as an explicit null; an array input becomes a comma-joined string in a query.
 */
export function pick(input: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = input[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A `json` param may arrive as already-parsed data or as the raw text the user typed. */
export function parseJsonField(name: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

export function jsonFields(
  body: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const out = { ...body };
  for (const k of keys) if (k in out) out[k] = parseJsonField(k, out[k]);
  return out;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
}

/** One request; returns the parsed JSON body (`{}` for an empty body, e.g. a 204). */
export async function call(
  ctx: HookContext,
  method: Method,
  path: string,
  opts: RequestOptions = {},
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  const hasBody = Array.isArray(opts.body)
    ? opts.body.length > 0
    : opts.body !== undefined && Object.keys(opts.body as object).length > 0;
  if (hasBody) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const query: Query = {};
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    query[k] = Array.isArray(v) ? v.join(",") : v as string | number | boolean;
  }
  const res = await ctx.fetch(buildUrl(path, query), init);
  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text.slice(0, 200) };
    }
  }
  if (!res.ok) {
    const { code, message } = errorParts(json);
    throw new MuralError(
      `Mural ${method} ${path} failed (${res.status})${code ? ` ${code}` : ""}${
        message ? `: ${message}` : ""
      }`,
      res.status,
      code,
    );
  }
  return json;
}

/** `{ value: {...} }` -> `{...}`. */
export async function one(
  ctx: HookContext,
  method: Method,
  path: string,
  opts: RequestOptions = {},
): Promise<Record<string, unknown>> {
  const json = await call(ctx, method, path, opts);
  const v = json.value;
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
}

/** `{ value: [a] }` -> `a` (widget creates answer with an array). */
export async function first(
  ctx: HookContext,
  method: Method,
  path: string,
  opts: RequestOptions = {},
): Promise<Record<string, unknown>> {
  const json = await call(ctx, method, path, opts);
  const v = Array.isArray(json.value) ? json.value[0] : undefined;
  return v && typeof v === "object" ? v as Record<string, unknown> : {};
}

/** `{ value: [...], next }` -> `{ items, next }`. */
export async function list(
  ctx: HookContext,
  method: Method,
  path: string,
  opts: RequestOptions = {},
): Promise<{ items: unknown[]; next?: string }> {
  const json = await call(ctx, method, path, opts);
  const items = Array.isArray(json.value) ? json.value : [];
  return typeof json.next === "string" && json.next ? { items, next: json.next } : { items };
}

/** The tags list is `{ value: [...] }` with no paging. */
export async function tags(
  ctx: HookContext,
  method: Method,
  path: string,
  opts: RequestOptions = {},
): Promise<{ items: unknown[] }> {
  const json = await call(ctx, method, path, opts);
  return { items: Array.isArray(json.value) ? json.value : [] };
}

/** A 204 delete: no body, so report what was removed. */
export async function none(
  ctx: HookContext,
  method: Method,
  path: string,
  opts: RequestOptions,
  id: string,
): Promise<{ deleted: true; id: string }> {
  await call(ctx, method, path, opts);
  return { deleted: true, id };
}
