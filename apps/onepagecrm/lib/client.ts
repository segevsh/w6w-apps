import type { HookContext } from "@w6w/types";

/**
 * OnePageCRM REST API v3.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI document
 * (https://raw.githubusercontent.com/OnePageCRM/swagger/master/swagger.yaml, `servers[0].url`
 * = `https://app.onepagecrm.com/api/v3`), the developer portal's `llms-full.txt`, and live probes.
 *
 * ## Facts that decide how this client behaves
 *
 * - **Paths are the spec's, with no `.json` suffix**, and every call sends `Accept:
 *   application/json`. Without that header an unauthenticated `GET /users` answers
 *   `application/xml`; with it (or with a `.json` suffix) the answer is the JSON envelope.
 * - **Success is `{"status":0,"message":"OK","timestamp":…,"data":{…}}`.** An error drops
 *   `timestamp`/`data` and carries `error_name`. The body's `status` is an *application* code
 *   and does NOT match the HTTP status: bad credentials are HTTP 401 with `"status":400`.
 *   So failures are classified from `error_name`, with the HTTP status only as a hint.
 * - **The request-rate throttle is HTTP 403 with a `text/plain` body `Rate Limit Exceeded`**,
 *   not 429 and not the JSON envelope. 429 is the (separate) concurrent-connection limit.
 *   A 403 with the JSON envelope is a real permission error.
 * - **Credentials are never added here.** The Auth `sign` hook stamps `Authorization: Basic`.
 */
export const API_HOST = "app.onepagecrm.com";
export const API_URL = `https://${API_HOST}/api/v3`;

export type QueryValue = string | number | boolean | string[] | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** `error_name` values that mean "the credential was refused". Verified: invalid_login (live). */
export const AUTH_ERRORS = new Set([
  "invalid_login",
  "invalid_auth_token",
  "authorization_data_not_found",
  "invalid_access_token",
]);

export interface ErrorParts {
  name?: string;
  message?: string;
}

/** Read the vendor error envelope; `{}` when the body is not one. */
export function errorParts(body: unknown): ErrorParts {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as { error_name?: unknown; error_message?: unknown; message?: unknown };
    if (typeof b.error_name === "string") {
      return {
        name: b.error_name,
        message: typeof b.error_message === "string"
          ? b.error_message
          : typeof b.message === "string"
          ? b.message
          : undefined,
      };
    }
  }
  return {};
}

/** True for both throttle signals: 429, or 403 with the plain-text `Rate Limit Exceeded` body. */
export function isThrottled(status: number, contentType: string | null, text: string): boolean {
  if (status === 429) return true;
  return status === 403 && (contentType ?? "").includes("text/plain") &&
    text.includes("Rate Limit Exceeded");
}

/** Build a query string, dropping unset values; arrays are comma-joined, booleans spelled out. */
export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length) usp.set(k, v.join(","));
    } else usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Comma-separated string or array -> trimmed non-empty list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a JSON string or an already-parsed value; undefined/blank stays undefined. */
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
  const v = String(id ?? "").trim();
  if (!v) throw new Error("an id is required");
  return encodeURIComponent(v);
}

/** The `Param[]` fragment every paginated list shares. `per_page` is capped at 100 by the vendor. */
export const PAGE_PARAMS = [
  {
    key: "page",
    label: "Page",
    type: "number" as const,
    default: 1,
    validation: { min: 1, integer: true },
    hint: "1-indexed. The response's `maxPage` is the last page.",
  },
  {
    key: "perPage",
    label: "Per page",
    type: "number" as const,
    default: 10,
    validation: { min: 1, max: 100, integer: true },
    hint: "Maximum 100 (vendor default 10).",
  },
];

export const SORT_ORDER_PARAM = {
  key: "order",
  label: "Order",
  type: "select" as const,
  options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
};

export interface PageInput {
  page?: number;
  perPage?: number;
}

export function pageQuery(input: PageInput): Record<string, QueryValue> {
  return { page: input.page, per_page: input.perPage };
}

/** What a list action returns: the wrapped records plus the vendor's paging state. */
export function listResult(data: unknown, listKey: string): Record<string, unknown> {
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    items: Array.isArray(d[listKey]) ? d[listKey] : [],
    totalCount: d.total_count,
    page: d.page,
    perPage: d.per_page,
    maxPage: d.max_page,
  };
}

export class OnePageClient {
  constructor(private readonly ctx: HookContext) {}

  /** Perform a call; return the envelope's `data`. Throws on any vendor error. */
  async data(path: string, opts: RequestOptions = {}): Promise<unknown> {
    const method = opts.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(`${API_URL}${path}${buildQuery(opts.query)}`, {
      method,
      headers,
      body,
    });
    const text = await res.text();
    const label = `OnePageCRM ${method} ${path}`;

    if (isThrottled(res.status, res.headers.get("content-type"), text)) {
      throw new Error(
        `${label} was throttled (HTTP ${res.status}); back off and retry. Rate Limit Exceeded is ` +
          "OnePageCRM's request-rate signal, not a permission error",
      );
    }
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    const { name, message } = errorParts(parsed);
    if (!res.ok || name !== undefined) {
      const detail = name
        ? `${name}${message ? `: ${message}` : ""}`
        : text.replace(/\s+/g, " ").slice(0, 200);
      const hint = name && AUTH_ERRORS.has(name) ? " (check the user ID and API key)" : "";
      throw new Error(`${label} failed (HTTP ${res.status}) ${detail}${hint}`.trim());
    }
    if (parsed === null || typeof parsed !== "object" || !("data" in (parsed as object))) {
      throw new Error(
        `${label} returned a body that is not the OnePageCRM envelope (HTTP ${res.status})`,
      );
    }
    return (parsed as { data: unknown }).data;
  }
}
