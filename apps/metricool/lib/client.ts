import type { HookContext } from "@w6w/types";

/**
 * Thin client for the Metricool REST API (`app.metricool.com/api`).
 *
 * Read on 2026-10-06 from the vendor's own OpenAPI document
 * (`app.metricool.com/api/swagger.json`, 559 paths) and its intro page. What is not obvious from
 * the paths themselves:
 *
 *  1. **Three identifiers ride on every call**: the `userToken` (header `X-Mc-Auth`, the only one
 *     the vendor lets you move into a header), the `userId` and the `blogId` (the brand), both as
 *     query parameters. None is declared per operation in the spec. The token and `userId` belong
 *     to the Connection and are stamped by `sign` (`auth/user-token.ts`); `blogId` names a brand,
 *     so it is an Action parameter (`brand-list` finds it).
 *  2. **Every v2 response is an envelope** `{ metadata, page, data }`; {@link call} returns
 *     `data`.
 *  3. **The gateway answers 401 for any path, real or not** (measured: `/v2/nope` and
 *     `/v2/settings/brands` return the identical body), so a 401 never proves a route exists.
 */
export const API_BASE = "https://app.metricool.com/api";

export class MetricoolError extends Error {
  constructor(message: string, readonly status: number, readonly vendorMessage?: string) {
    super(message);
    this.name = "MetricoolError";
  }
}

export type QueryValue = string | number | boolean | string[] | undefined | null;
export type Query = Record<string, QueryValue>;

/** Trim and URL-encode a path segment; an empty id would silently hit the collection route. */
export function encodeId(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("A required ID was empty");
  return encodeURIComponent(s);
}

export function buildUrl(path: string, query: Query = {}): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, String(item));
    } else url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** Metricool errors look like `{status, code, title, detail}`; take the most specific string. */
export function errorMessage(body: unknown): string | undefined {
  const b = body as { detail?: unknown; title?: unknown; message?: unknown } | null;
  for (const v of [b?.detail, b?.message, b?.title]) if (typeof v === "string" && v) return v;
  return undefined;
}

export interface CallOptions {
  query?: Query;
  /** The brand id (`blogId`). Omitted for the few calls that are not brand-scoped. */
  blogId?: unknown;
  body?: unknown;
}

/** One request; returns the envelope's `data`. Non-2xx throws {@link MetricoolError}. */
export async function call(
  ctx: HookContext,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  opts: CallOptions = {},
): Promise<unknown> {
  const query: Query = { ...opts.query };
  if (opts.blogId !== undefined && opts.blogId !== null && String(opts.blogId).trim() !== "") {
    query.blogId = String(opts.blogId).trim();
  }
  const headers: Record<string, string> = { accept: "application/json" };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(buildUrl(path, query), { method, headers, body });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const vendor = errorMessage(parsed);
    throw new MetricoolError(
      `Metricool ${method} ${path} failed with HTTP ${res.status}${vendor ? `: ${vendor}` : ""}`,
      res.status,
      vendor,
    );
  }
  if (parsed && typeof parsed === "object" && "data" in (parsed as object)) {
    return (parsed as { data: unknown }).data;
  }
  return parsed;
}

/** A list endpoint's `data` array, tolerating an absent one. */
export async function callList(
  ctx: HookContext,
  path: string,
  opts: CallOptions = {},
): Promise<{ items: unknown[]; count: number }> {
  const data = await call(ctx, "GET", path, opts);
  const items = Array.isArray(data) ? data : [];
  return { items, count: items.length };
}

/** `data: true` on success for delete/restore style calls. */
export async function callFlag(
  ctx: HookContext,
  method: "PUT" | "POST" | "DELETE" | "PATCH",
  path: string,
  opts: CallOptions = {},
): Promise<{ success: boolean }> {
  const data = await call(ctx, method, path, opts);
  return { success: data === true };
}

/** Drop unset inputs so a blank form field is never sent. */
export function pick(input: object, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const src = input as Record<string, unknown>;
  for (const k of keys) {
    const v = src[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A json param arrives as a value or, from some hosts, as a string; always return a value. */
export function parseJson(value: unknown, field: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${field} must be valid JSON`);
  }
}
