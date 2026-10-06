import type { HookContext } from "@w6w/types";

/**
 * Youform REST API client.
 *
 * Source of truth: Youform's published Postman collection ("Youform",
 * collection id 21094175-e04cd7f9-…), fetched 2026-10-06 through Postman's
 * public `_api/collection?populate=true` endpoint, plus unauthenticated live
 * probes of every route. `youform.com/api-docs` is a redirect to that
 * collection; there is no OpenAPI document, and the page is a JS shell that
 * shows nothing without the JSON behind it.
 *
 * ## One host, and it is the app host
 *
 * The API lives at `https://app.youform.com/api` — the same origin as the
 * dashboard. `api.youform.com` and `docs.youform.com` do not resolve. An
 * unknown route answers a real JSON 404 (`{"message":"The route api/x could not
 * be found."}`), and every documented route answers `401
 * {"message":"Unauthenticated."}` without a token, which is how each route was
 * confirmed to exist without a paid credential.
 *
 * ## Envelopes
 *
 * Laravel again: single resources answer `{"data": {...}}`, lists answer a
 * Laravel paginator nested one level down — `{"data": {"current_page": 1,
 * "data": [...], ...}}`, so the rows are at `data.data`. Webhook writes answer
 * `{"success": true, ...}`. Every action returns the body verbatim.
 *
 * ## Errors
 *
 * `{"message": "..."}`, plus Laravel's `{"errors": {field: [messages]}}` on a
 * 422. A 400 is also what the API answers when a free-plan account sends
 * `is_complete=false` to the submissions endpoint (documented in the
 * collection).
 */

export const API_BASE = "https://app.youform.com";
export const API_URL = `${API_BASE}/api`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface ErrorBody {
  message?: string;
  errors?: Record<string, string[] | string>;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes)`;
}

/** Path-escape a caller-supplied slug or id so it cannot leave its segment. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** `true`/`false` as the `1`/`0` Youform documents; `undefined` stays absent. */
export function flag01(v: boolean | undefined | null): string | undefined {
  if (v === undefined || v === null) return undefined;
  return v ? "1" : "0";
}

export function formatYouformError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ErrorBody;
  } catch { /* not JSON */ }
  if (!parsed) return truncate(`Youform ${status} for ${method} ${path}: ${raw}`);

  const parts: string[] = [`Youform ${status} for ${method} ${path}`];
  if (parsed.message) parts.push(parsed.message);
  if (parsed.errors && typeof parsed.errors === "object") {
    const detail = Object.entries(parsed.errors)
      .map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(" ") : m}`)
      .join("; ");
    if (detail) parts.push(detail);
  }
  if (status === 401) {
    parts.push("the API token was rejected — create a new one under Account Settings → API Tokens");
  }
  return truncate(parts.join(": "), 1000);
}

export class YouformClient {
  constructor(private ctx: HookContext) {}

  /** The parsed body, verbatim. An empty body becomes `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
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
    if (!res.ok) {
      throw new Error(formatYouformError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
