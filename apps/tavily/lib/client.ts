import type { HookContext } from "@w6w/types";

/**
 * Tavily REST client.
 *
 * Verified 2026-10-06 against the OpenAPI document embedded in each page of
 * `docs.tavily.com/documentation/api-reference/endpoint/*.md`: one server
 * (`https://api.tavily.com/`), no version prefix, bearer-key auth.
 *
 * Credentials are never added here. `sign` in `auth/api-key.ts` stamps the
 * `Authorization` header on every request this client makes.
 *
 * Three wire facts shape the error handling:
 *  - Errors arrive as `{"detail": {"error": "..."}}`, but request validation
 *    (HTTP 422) answers `{"detail": [{loc, msg, type}, ...]}`.
 *  - Tavily uses two non-standard statuses: **432** (key or plan limit
 *    exceeded) and **433** (pay-as-you-go limit exceeded).
 *  - `POST /extract` answers 200 even when some or all URLs failed; the
 *    failures are in `failed_results`.
 */
export const API_BASE = "https://api.tavily.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface TavilyErrorBody {
  detail?:
    | { error?: string; failed_results?: unknown[] }
    | Array<{ loc?: Array<string | number>; msg?: string }>
    | string;
}

/** Drop undefined, null and empty-string values so omitted params use vendor defaults. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept an array, or a comma/newline separated string (the form a text param
 * produces), and return a clean string list, or undefined when empty.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(/[\n,]/))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** The vendor's own error message from a raw body, if it has one. */
export function errorMessage(raw: string): string | undefined {
  let parsed: TavilyErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TavilyErrorBody;
  } catch {
    return undefined;
  }
  const detail = parsed?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => `${(d.loc ?? []).join(".")}: ${d.msg ?? ""}`.trim());
    return parts.length ? parts.join("; ") : undefined;
  }
  return detail?.error;
}

export function formatTavilyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const msg = errorMessage(raw);
  const hint = status === 432
    ? " (key or plan credit limit exceeded)"
    : status === 433
    ? " (pay-as-you-go limit exceeded)"
    : status === 429
    ? " (rate limited; retry after the Retry-After delay)"
    : "";
  return truncate(`Tavily ${status}${hint} for ${method} ${path}: ${msg ?? truncate(raw)}`, 1000);
}

export class TavilyClient {
  constructor(private ctx: HookContext) {}

  /** Send a request and parse the JSON body. 2xx (including 201/202) is success. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatTavilyError(res.status, init.method!, url.pathname, text));
    return (text ? JSON.parse(text) : undefined) as T;
  }

  post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.json<T>(path, { method: "POST", body: compact(body) });
  }
}
