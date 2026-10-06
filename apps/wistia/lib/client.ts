/**
 * Wistia Data API client — the `/modern` surface at `api.wistia.com`.
 *
 * Three things here are not what a reader of the legacy `/v1` API would expect, and each was
 * read off the vendor's OpenAPI documents (docs.wistia.com/reference/*.md, API version
 * `2026-09`) rather than assumed:
 *
 *  1. **Every operation declares a required `X-Wistia-API-Version` header** (default `2026-09`).
 *     It is a version pin, not a credential, so it is stamped here and never in `sign`.
 *  2. **Lists answer a bare JSON array** — no `{data: …}` envelope and no `total`. A page
 *     boundary is "fewer rows than `per_page`", and cursor pagination rides on a `cursor`
 *     property inside each row (see `pageOf`).
 *  3. **Errors have two shapes.** 401 is `{code, error}` (`code` is one of
 *     `unauthorized_credentials`, `account_inactive`, `unauthorized_scope`,
 *     `unauthorized_params`); everything else is `{error}`, and a 400 may add `errors[]`.
 */
import type { HookContext } from "@w6w/types";

export const API_BASE = "https://api.wistia.com";
export const API_PREFIX = "/modern";
export const API_VERSION = "2026-09";
export const VERSION_HEADER = "x-wistia-api-version";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface WistiaErrorBody {
  code?: string;
  error?: string;
  errors?: string[];
}

/** Drop unset values so a half-filled form never sends `name=` or `folder_id=`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a real array or a comma-separated string from a form field. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export function formatWistiaError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: WistiaErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as WistiaErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }
  if (!parsed || typeof parsed !== "object" || !parsed.error) {
    return `Wistia ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const parts = [
    `Wistia ${status}${parsed.code ? ` ${parsed.code}` : ""} for ${method} ${path}`,
    parsed.error,
    parsed.errors?.length ? parsed.errors.join("; ") : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export interface Page<T> {
  items: T[];
  count: number;
  /** The `cursor` of the last row — pass as `cursorAfter` to fetch the next page. */
  nextCursor: string | null;
}

/** Wrap Wistia's bare array into a stable, documented page shape. */
export function pageOf<T>(rows: T[] | undefined | null): Page<T> {
  const items = Array.isArray(rows) ? rows : [];
  const last = items[items.length - 1] as { cursor?: string | null } | undefined;
  return { items, count: items.length, nextCursor: last?.cursor ?? null };
}

export class WistiaClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Array parameters are documented as `name[]=a&name[]=b` — repeat the key.
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, item); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      [VERSION_HEADER]: API_VERSION,
    };
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatWistiaError(res.status, method, url.pathname, detail));
    }
    const text = res.status === 204 ? "" : await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}
