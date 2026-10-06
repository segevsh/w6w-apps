import type { HookContext } from "@w6w/types";

/**
 * Thin client over the GoCanvas REST API v3 (`https://www.gocanvas.com/api/v3`,
 * reference at `https://api.gocanvas.com/api/v3/docs`, read 2026-10-06).
 *
 * The credential is never handled here: every request goes through `ctx.fetch`
 * and the Auth `sign` hook stamps `Authorization: Basic ...` on it.
 */

export const API_BASE = "https://www.gocanvas.com";

export const API_PREFIX = "/api/v3";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface PageInfo {
  currentPage: number | null;
  pageItems: number | null;
  totalCount: number | null;
  totalPages: number | null;
  /** The next page number, or null on the last page (derived from `total-pages`). */
  nextPage: number | null;
}

/** Drop undefined / null / empty-string so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function encodeId(id: string | number): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("an id is required");
  return encodeURIComponent(s);
}

/** `"1, 2,3"` or `[1,2]` -> `["1","2","3"]`; empty -> undefined. */
export function toList(
  v: string | Array<string | number> | undefined | null,
): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Comma-separated ids -> numbers; throws on a non-numeric entry instead of sending NaN. */
export function toIdList(v: string | Array<string | number> | undefined | null, label: string) {
  const items = toList(v);
  if (!items) return undefined;
  return items.map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n)) throw new Error(`${label}: "${s}" is not a numeric id`);
    return n;
  });
}

/** A JSON param may arrive as an object/array or as a JSON string from a text box. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** `hard_delete=true` only when asked for — the default DELETE is a soft delete. */
export function hardDeleteQuery(hardDelete: boolean | undefined): Record<string, QueryValue> {
  return hardDelete ? { hard_delete: true } : {};
}

/**
 * GoCanvas answers errors in two shapes, measured 2026-10-06: the documented
 * `{"errors": ["..."]}` array (400/415/422) and a singular `{"error": "..."}`
 * string on 401 (`You must be logged in to access this section of the site.`,
 * `Bearer token not authorized.`). Both are read; anything else is shown raw.
 */
export function extractGoCanvasError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { errors?: unknown; error?: unknown; message?: unknown };
    if (Array.isArray(parsed?.errors)) return parsed.errors.map((e) => String(e)).join("; ");
    if (typeof parsed?.error === "string") return parsed.error;
    if (typeof parsed?.message === "string") return parsed.message;
    if (parsed?.errors !== undefined) return JSON.stringify(parsed.errors);
  } catch { /* not JSON — keep the raw body */ }
  return raw;
}

export function formatGoCanvasError(
  status: number,
  method: string,
  path: string,
  raw: string,
  headers?: Headers,
): string {
  let hint = "";
  if (status === 429) {
    const reset = headers?.get("ratelimit-reset");
    hint = reset
      ? ` (rate limited; RateLimit-Reset ${reset} UTC epoch seconds - do not retry before then)`
      : " (rate limited; wait at least a minute before retrying)";
  }
  return truncate(
    `GoCanvas ${status} for ${method} ${path}: ${extractGoCanvasError(raw)}${hint}`,
    1000,
  );
}

function headerNumber(headers: Headers, ...names: string[]): number | null {
  for (const name of names) {
    const v = headers.get(name);
    if (v !== null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

/** The pagination headers. The docs table spells them with hyphens, the example with underscores. */
export function readPageInfo(headers: Headers): PageInfo {
  const currentPage = headerNumber(headers, "current-page", "current_page");
  const totalPages = headerNumber(headers, "total-pages", "total_pages");
  return {
    currentPage,
    pageItems: headerNumber(headers, "page-items", "page_items"),
    totalCount: headerNumber(headers, "total-count", "total_count"),
    totalPages,
    nextPage: currentPage !== null && totalPages !== null && currentPage < totalPages
      ? currentPage + 1
      : null,
  };
}

export class GoCanvasClient {
  constructor(private ctx: HookContext) {}

  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<{ data: unknown; headers: Headers }> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatGoCanvasError(res.status, method, url.pathname, detail, res.headers));
    }
    if (res.status === 204) return { data: undefined, headers: res.headers };
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      throw new Error(
        `GoCanvas ${res.status} for ${method} ${url.pathname}: response was not JSON (` +
          `${truncate(text, 120)})`,
      );
    }
    return { data, headers: res.headers };
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.send(path, options)).data as T;
  }

  /**
   * A list endpoint. GoCanvas returns a bare JSON array and puts the paging in
   * response headers, so the array becomes `items` and the headers `pagination`.
   */
  async list(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<{ items: unknown[]; pagination: PageInfo }> {
    const { data, headers } = await this.send(path, { query });
    return { items: Array.isArray(data) ? data : [], pagination: readPageInfo(headers) };
  }
}

/** At least one of the named filters must be set; the API 4xxs on a bare list otherwise. */
export function requireOneOf(input: Record<string, unknown>, keys: string[], what: string): void {
  const has = keys.some((k) => input[k] !== undefined && input[k] !== null && input[k] !== "");
  if (!has) throw new Error(`${what} needs at least one of: ${keys.join(", ")}`);
}

/** DELETE answers `{ message }` for most resources and may answer 204; normalise the empty case. */
export function deleted(data: unknown): unknown {
  return data === undefined ? { deleted: true } : data;
}
