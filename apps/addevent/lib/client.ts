import type { HookContext } from "@w6w/types";

/**
 * AddEvent Calendar & Events API v2 REST client.
 *
 * Every path, verb, parameter and error shape here was read out of AddEvent's own
 * machine-readable OpenAPI 3.1 document (`info.version` `v2.14.0`), embedded as
 * `oasDefinition` in the React SSR payload of its ReadMe-hosted reference pages
 * (`docs.addevent.com/reference/*`, fetched 2026-09-15) — not from the marketing
 * "Calendar & Events API" prose page, which only sketches the shape and says so
 * ("Field names above are illustrative — use the exact schema shown in the endpoint
 * reference."). The error envelope and the 401/403 distinction were additionally
 * confirmed with live, unauthenticated and invalid-token probes against
 * `api.addevent.com` on the same day.
 *
 * ## One host, one base path
 *
 * The OpenAPI document declares exactly one server: `https://api.addevent.com/calevent/v2`.
 * There is no regional host and no sandbox environment.
 *
 * ## Auth
 *
 * Bearer token in the `Authorization` header (`securitySchemes.bearerAuth`,
 * `bearerFormat: "APIkey"`). The one public exception is `GET /timezones`, which the
 * OpenAPI document overrides with `security: [{}]` — confirmed live: it answers `200`
 * with no `Authorization` header at all.
 *
 * ## Errors
 *
 * Confirmed live shape for a 401 (no/invalid credential):
 * `{"error_id":"1-...","error_message":"","error_code":900}`. AddEvent's own error
 * codes page documents `error_id` + `error_message` as the general 4xx shape, plus a
 * `property_validation_errors` array on 400s for create/update bodies and search
 * query parameters. `error_message` is frequently empty even when `error_code` is
 * present, so {@link formatAddEventError} falls back to the HTTP status's documented
 * meaning rather than printing a blank reason.
 *
 * A 403 is NOT "no valid credential" — AddEvent's own response-code table
 * distinguishes it explicitly: "The API key doesn't have permission to perform the
 * request", which covers both an account plan that does not include API access (the
 * free Hobby plan) and a usage limit the account has exceeded. Both mean the
 * credential is otherwise fine, so a 403 is never treated as a dead Connection.
 */

/** The one and only API origin + version prefix. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.addevent.com/calevent/v2";

export type QueryValue = string | number | boolean | undefined | null | readonly string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

export interface AddEventPropertyError {
  name?: string;
  reason?: string;
}

/** The documented 4xx envelope. Confirmed live for a 401; the errors reference page
 * documents the same `error_id`/`error_message` pair plus `property_validation_errors`
 * for 400s. */
export interface AddEventErrorBody {
  error_id?: string;
  error_message?: string;
  error_code?: number;
  property_validation_errors?: AddEventPropertyError[];
}

/** `pagination` object attached to every search response. */
export interface AddEventPagination {
  current_page?: number;
  next_page?: number;
  previous_page?: number;
  total_items?: number;
  total_pages?: number;
  page_size?: number;
}

/** `links` object attached to every search response. */
export interface AddEventLinks {
  next_page_url?: string;
  previous_page_url?: string;
}

/** Keep an error message readable — a validation body can carry many field errors. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — both are meaningful
 * values a caller may deliberately send.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * The HTTP status code summary from AddEvent's own "Response codes & errors" page,
 * used as a fallback message when a 4xx/5xx body carries no `error_message`.
 */
const STATUS_MEANING: Record<number, string> = {
  400: "the request was unacceptable, often due to a missing required parameter",
  401: "no valid API key was provided",
  403: "the API key doesn't have permission to perform this request — the account's plan may " +
    "not include API access, or a usage limit has been exceeded",
  404: "the requested resource does not exist, has been deleted, or does not belong to the " +
    "account which made the request",
  405: "this endpoint does not support this HTTP method",
  500: "something went wrong on AddEvent's end",
};

/**
 * Turn AddEvent's error body into one actionable line.
 *
 * `error_message` is kept when present, but AddEvent's own confirmed 401 body carries
 * an empty string there — so a blank message falls back to the documented meaning of
 * the status code rather than surfacing nothing. `property_validation_errors` is
 * expanded field-by-field, because that is exactly what a caller needs to fix a
 * rejected create/update body or search query.
 */
export function formatAddEventError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: AddEventErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as AddEventErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.error_id && !parsed.error_message && parsed.error_code === undefined)) {
    const fallback = STATUS_MEANING[status];
    return truncate(
      `AddEvent ${status} for ${method} ${path}` +
        (raw ? `: ${raw}` : fallback ? `: ${fallback}` : ""),
      1000,
    );
  }

  const fieldErrors = (parsed.property_validation_errors ?? [])
    .filter((e) => e.name || e.reason)
    .map((e) => `${e.name ?? "?"}: ${e.reason ?? "invalid"}`)
    .join("; ");

  const parts = [
    `AddEvent ${status} for ${method} ${path}`,
    parsed.error_message || STATUS_MEANING[status],
    fieldErrors || undefined,
    parsed.error_code !== undefined ? `error_code ${parsed.error_code}` : undefined,
    parsed.error_id ? `(error_id ${parsed.error_id})` : undefined,
  ].filter(Boolean);
  return truncate(parts.join(" — "), 1000);
}

export class AddEventClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body. Returns `undefined` for a `204 No content`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — for `DELETE`, which answers `204` with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // `calendar_ids` / `event_ids` / `attending` / `status` are documented with
      // `style: form, explode: false` — ONE comma-separated value, never a repeated key.
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatAddEventError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
