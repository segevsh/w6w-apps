import type { HookContext } from "@w6w/types";

/**
 * Thin client for the Woodpecker REST API (`api.woodpecker.co`).
 *
 * Verified on 2026-10-06 against developers.woodpecker.co (each page's `.md`
 * variant) and live unauthenticated probes. What shaped the design:
 *
 *  1. **Two API versions, two error dialects.** Campaign settings, mailboxes,
 *     users, inbox, blacklist, LinkedIn accounts and manual tasks are `/rest/v2`
 *     (errors: `{title, status, detail, timestamp}` or `{code, message, details}`).
 *     Prospects and the campaign list/statistics are still `/rest/v1` (errors:
 *     `{status: {status: "ERROR", code, msg}}`). {@link errorMessage} reads both.
 *  2. **v1 can report failure inside a body.** A prospect import answers with a
 *     `status` block and per-prospect `{status: "ERROR", code, msg}` rows;
 *     {@link call} treats a top-level `status.status === "ERROR"` as a failure
 *     whatever the HTTP status.
 *  3. **Empty success bodies.** Run/pause/stop/delete/reply answer `200` with no body.
 *  4. **Pagination differs per endpoint** (1-based `page`/`per_page` on prospects,
 *     0-based `page` on users, an opaque cursor on the inbox, a `limit` on tasks);
 *     each action exposes the vendor's own parameters.
 */
export const API_BASE = "https://api.woodpecker.co";
export const V1 = "/rest/v1";
export const V2 = "/rest/v2";

export class WoodpeckerError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly vendorCode: string | undefined,
  ) {
    super(message);
    this.name = "WoodpeckerError";
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Trim and URL-encode a path segment; an empty id would silently hit the list route. */
export function encodeId(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("A required ID was empty");
  return encodeURIComponent(s);
}

export function buildUrl(version: string, path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${version}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

export interface VendorError {
  code?: string;
  message?: string;
}

/** Read Woodpecker's v1 (`status.msg`) and v2 (`detail` / `message`) error bodies. */
export function errorMessage(body: unknown): VendorError {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return {};
  const status = b.status as Record<string, unknown> | undefined;
  if (status && typeof status === "object") {
    return {
      code: typeof status.code === "string" ? status.code : undefined,
      message: typeof status.msg === "string" ? status.msg : undefined,
    };
  }
  const message = typeof b.detail === "string"
    ? b.detail
    : typeof b.message === "string"
    ? b.message
    : undefined;
  const code = typeof b.code === "string"
    ? b.code
    : typeof b.title === "string"
    ? b.title
    : undefined;
  return { code, message };
}

/** Drop `undefined`/`null`/empty-string inputs so an unset field is never sent. */
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

/** A required non-empty array, from a JSON param or its raw text. */
export function requireArray(name: string, value: unknown, max?: number): unknown[] {
  const parsed = parseJsonField(name, value);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${name} must be a non-empty JSON array`);
  }
  if (max !== undefined && parsed.length > max) {
    throw new Error(`${name} accepts at most ${max} entries per request`);
  }
  return parsed;
}

/** Comma-join a list param that may arrive as an array or as text. */
export function csv(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.length ? value.join(",") : undefined;
  return String(value);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export interface Reply {
  status: number;
  headers: Headers;
  body: unknown;
}

/** One request; the parsed JSON body is `{}` when empty. Throws on any failure. */
export async function request(
  ctx: HookContext,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  version: string,
  path: string,
  opts: RequestOptions = {},
): Promise<Reply> {
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(buildUrl(version, path, opts.query), init);
  const text = await res.text();
  let body: unknown = {};
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 200) };
    }
  }
  const vendor = errorMessage(body);
  const v1Error = (body as { status?: { status?: unknown } } | null)?.status?.status === "ERROR";
  if (!res.ok || v1Error) {
    throw new WoodpeckerError(
      `Woodpecker ${method} ${version}${path} failed (${res.status})` +
        `${vendor.code ? ` ${vendor.code}` : ""}${vendor.message ? `: ${vendor.message}` : ""}`,
      res.status,
      vendor.code,
    );
  }
  return { status: res.status, headers: res.headers, body };
}

export async function call(
  ctx: HookContext,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  version: string,
  path: string,
  opts: RequestOptions = {},
): Promise<unknown> {
  return (await request(ctx, method, version, path, opts)).body;
}

/**
 * Normalise a v1 prospect/campaign list. The vendor answers a plain array,
 * unwraps a `{prospect}` row defensively, and answers `{message}` (no array)
 * when nothing matches.
 */
export function listOf(body: unknown): { items: unknown[]; message?: string } {
  if (Array.isArray(body)) {
    return {
      items: body.map((row) =>
        (row && typeof row === "object" && "prospect" in row)
          ? (row as { prospect: unknown }).prospect
          : row
      ),
    };
  }
  const message = (body as { message?: unknown } | null)?.message;
  return { items: [], ...(typeof message === "string" ? { message } : {}) };
}
