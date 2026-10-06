import type { HookContext } from "@w6w/types";

/**
 * Elastic Email API v4 REST client.
 *
 * Verified 2026-10-06 against the vendor's own OpenAPI 3.0.3 document
 * (`elasticemail.com/api/redoc-spec/api-v4`, 74 paths) plus unauthenticated
 * probes of `api.elasticemail.com`.
 *
 * ## Shapes worth knowing
 *
 *  - One host, `api.elasticemail.com`, version in the path (`/v4`).
 *  - Auth is the `X-ElasticEmail-ApiKey` header (set only in `sign`).
 *  - **List endpoints answer a bare JSON array**, no envelope and no cursor.
 *    Paging is `limit` + `offset`. The spec documents no maximum, and the
 *    defaults differ per endpoint (contacts 20, templates 500).
 *  - Property names are PascalCase (`FirstName`, `ListName`).
 *  - Errors are `{"Error": "<message>"}` — a single free-text string, no
 *    machine code. Measured: a missing or unknown key answers HTTP 400
 *    `{"Error":"APIKey Expired"}`, NOT 401.
 *  - Mutations such as DELETE answer `200` with an empty body.
 *  - Array query parameters (`listnames`) are sent repeated, the OpenAPI
 *    default for `type: array`.
 *  - Names (lists, templates, campaigns) and emails are path segments, so they
 *    are percent-encoded.
 *  - No rate-limit header is documented or observed.
 */
export const API_BASE = "https://api.elasticemail.com";
export const API_PREFIX = "/v4";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a comma/newline string or array into a trimmed list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(/[,\n]/))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied name/email so `/` or `?` cannot leave the segment. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** The vendor's `{"Error": "..."}` text, if the payload has one. */
export function errorText(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const e = (payload as Record<string, unknown>).Error;
    if (typeof e === "string") return e;
  }
  return undefined;
}

export function formatElasticError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let message: string | undefined;
  try {
    message = errorText(JSON.parse(raw));
  } catch { /* not JSON */ }
  if (message === undefined) {
    return `Elastic Email ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  return truncate(`Elastic Email ${status} for ${method} ${path}: ${message}`, 1000);
}

export class ElasticClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, item); }
      else url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(formatElasticError(res.status, method, url.pathname, text));
    }
    if (!text) return undefined as T;
    const parsed = JSON.parse(text) as T;
    // A 2xx can still carry the vendor's error envelope; the body decides.
    const err = errorText(parsed);
    if (err !== undefined) {
      throw new Error(formatElasticError(res.status, method, url.pathname, text));
    }
    return parsed;
  }
}
