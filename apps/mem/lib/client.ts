import type { HookContext } from "@w6w/types";

/**
 * Thin client for the **Mem API v2** (`api.mem.ai`).
 *
 * Read on 2026-10-06 from Mem's own OpenAPI document
 * (`docs.mem.ai/api-reference/openapi.json`) and its prose pages. The app builds
 * against `/v2/*` only: the spec still lists `/v0` and `/v1` routes (legacy
 * "mems"), which are not wrapped here.
 *
 *  - Auth is `Authorization: Bearer <API key>`; the `sign` hook owns it.
 *  - Lists are cursor-paged (`page` in, `next_page` out) except note search,
 *    which is `limit`/`offset` with a `snapshot_id`, and extended search, which
 *    has its own `next_page_cursor`.
 *  - Two error envelopes are documented/observed: the platform one
 *    `{"error_category","error_metadata":{"error_kind","message"}}` (401s) and
 *    the quota one `{"error":{"type","message","details"}}` (429).
 */
export const API_BASE = "https://api.mem.ai";

export class MemError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly vendorMessage: string | undefined,
    readonly errorKind: string | undefined,
  ) {
    super(message);
    this.name = "MemError";
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

export interface ErrorInfo {
  message?: string;
  /** Platform `error_metadata.error_kind` (e.g. NOT_AUTHORIZED) or quota `error.type`. */
  kind?: string;
}

/** Read the vendor's own error code and message out of either documented envelope. */
export function errorInfo(body: unknown): ErrorInfo {
  const b = (body ?? {}) as Record<string, unknown>;
  const meta = b.error_metadata as { error_kind?: unknown; message?: unknown } | undefined;
  if (meta && typeof meta === "object") {
    return {
      kind: typeof meta.error_kind === "string" ? meta.error_kind : undefined,
      message: typeof meta.message === "string" ? meta.message : undefined,
    };
  }
  const err = b.error;
  if (err && typeof err === "object") {
    const e = err as { type?: unknown; message?: unknown };
    return {
      kind: typeof e.type === "string" ? e.type : undefined,
      message: typeof e.message === "string" ? e.message : undefined,
    };
  }
  if (typeof err === "string") return { message: err };
  if (typeof b.detail === "string") return { message: b.detail };
  if (typeof b.message === "string") return { message: b.message };
  return {};
}

/** Drop `undefined`/`null`/empty-string inputs so an unset field is never sent as null. */
export function pick(input: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = input[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** {@link pick} for query-string inputs, typed as a {@link Query}. */
export function pickQuery(input: Record<string, unknown>, keys: readonly string[]): Query {
  const out: Query = {};
  for (const [k, v] of Object.entries(pick(input, keys))) {
    out[k] = typeof v === "string" || typeof v === "number" || typeof v === "boolean"
      ? v
      : String(v);
  }
  return out;
}

/** A list field may arrive as an array or as the comma/newline-separated text a user typed. */
export function list(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(/[,\n]/);
  const out = items.map((s) => s.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

export interface RequestOptions {
  query?: Query;
  body?: Record<string, unknown>;
}

/** One request; returns the parsed JSON body (`{}` for an empty body). */
export async function call(
  ctx: HookContext,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  opts: RequestOptions = {},
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (opts.body && Object.keys(opts.body).length > 0) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(buildUrl(path, opts.query), init);
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
    const info = errorInfo(json);
    throw new MemError(
      `Mem ${method} ${path} failed (${res.status})${info.message ? `: ${info.message}` : ""}`,
      res.status,
      info.message,
      info.kind,
    );
  }
  return json;
}

/** A cursor-paged list -> `{items, total, nextPage, hasMore}`. */
export function pageList(body: Record<string, unknown>): Record<string, unknown> {
  const nextPage = typeof body.next_page === "string" && body.next_page ? body.next_page : null;
  return {
    items: Array.isArray(body.results) ? body.results : [],
    total: body.total ?? null,
    nextPage,
    hasMore: nextPage !== null,
  };
}

/** A non-paged list (`results` + `total`) -> `{items, total}`. */
export function plainList(body: Record<string, unknown>): Record<string, unknown> {
  const items = Array.isArray(body.results) ? body.results : [];
  return { items, total: body.total ?? items.length };
}

/** Note search (offset-paged) -> `{items, total, offset, limit, hasMore, snapshotId}`. */
export function offsetList(body: Record<string, unknown>): Record<string, unknown> {
  return {
    items: Array.isArray(body.results) ? body.results : [],
    total: body.total ?? null,
    offset: body.offset ?? null,
    limit: body.limit ?? null,
    hasMore: body.has_next_page === true,
    snapshotId: body.snapshot_id ?? null,
  };
}

/** Extended search (cursor-paged) -> `{items, hasMore, nextPageCursor}`. */
export function cursorList(body: Record<string, unknown>): Record<string, unknown> {
  const cursor = typeof body.next_page_cursor === "string" && body.next_page_cursor
    ? body.next_page_cursor
    : null;
  return {
    items: Array.isArray(body.results) ? body.results : [],
    hasMore: body.has_next_page === true,
    nextPageCursor: cursor,
  };
}

/** A write that answers only `{request_id}` -> `{ok: true, requestId}`. */
export function ack(body: Record<string, unknown>): Record<string, unknown> {
  return { ok: true, requestId: body.request_id ?? null };
}

export const identity = (body: Record<string, unknown>) => body;
