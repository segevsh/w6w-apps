import type { HookContext } from "@w6w/types";

/**
 * Loyverse API v1.0 REST client.
 *
 * Verified 2026-10-06 against Loyverse's own OpenAPI 3.0 document
 * (`developer.loyverse.com/docs/API-Reference__v1.0.yaml`, 33 paths) plus
 * unauthenticated probes against `api.loyverse.com`.
 *
 * ## Shapes worth knowing
 *
 *  - One host, `api.loyverse.com`, version in the path (`/v1.0`).
 *  - **Lists are keyed by resource name** (`{"items":[…],"cursor":"…"}`), not
 *    wrapped in `data`. The `cursor` key is *absent* on the last page.
 *  - Pagination is cursor-based: `limit` (default 50, max 250) and `cursor`.
 *  - **Not every list paginates.** The spec documents `limit`/`cursor` only on
 *    items, categories, customers, employees, inventory, receipts, shifts and
 *    variants. Stores, discounts, taxes and payment types answer everything.
 *  - Errors are `{"errors":[{"code","details","field"}]}`; `code` is the stable
 *    machine value (`UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`, …).
 *  - Limit: 300 requests per 300 seconds per account; 429 `RATE_LIMITED`.
 *    No rate-limit header is documented.
 *  - A POST with an `id` in the body updates; without one it creates.
 */
export const API_BASE = "https://api.loyverse.com";
export const API_PREFIX = "/v1.0";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface LoyverseErrorBody {
  errors?: Array<{ code?: string; details?: string; field?: string }>;
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a comma string or array into a comma-joinable list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied id so `/` or `?` cannot leave the segment. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Turn Loyverse's error list into one line, keeping every `code` — they are
 * what the vendor's own docs are written against, and the status alone
 * (400 / 401 / 402 / 403) hides which one you hit.
 */
export function formatLoyverseError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: LoyverseErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as LoyverseErrorBody;
  } catch { /* not JSON */ }
  const errs = parsed?.errors;
  if (!Array.isArray(errs) || errs.length === 0) {
    return `Loyverse ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const lines = errs.map((e) =>
    `${e.code ?? "error"}${e.field ? ` (${e.field})` : ""}${e.details ? `: ${e.details}` : ""}`
  );
  const hint = status === 429
    ? " — limit is 300 requests per 300 seconds per account; retry with backoff"
    : status === 402
    ? " — the Loyverse subscription for this account has lapsed"
    : "";
  return truncate(`Loyverse ${status} for ${method} ${path}: ${lines.join("; ")}${hint}`, 1000);
}

export class LoyverseClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLoyverseError(res.status, method, url.pathname, detail));
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
