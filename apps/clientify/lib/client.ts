import type { HookContext } from "@w6w/types";

/**
 * Clientify REST client (`api.clientify.net`, v1).
 *
 * Every path, field and filter in this app comes from Clientify's published Postman
 * collection (`documenter.gw.postman.com/api/collections/29281481/2s9Y5VV4wj`, the source
 * behind developer.clientify.com, 279 requests, fetched 2026-10-06) plus live
 * unauthenticated probes of `api.clientify.net` on the same day.
 *
 * ## One host, `/v1`, trailing slashes are part of the path
 *
 * Every documented path starts `/v1/` and ends in `/`. The client never strips it.
 *
 * ## Errors are `{"detail": "..."}`, and the status code does not separate the cases
 *
 * Measured 2026-10-06 on `GET /v1/users/`:
 *
 * ```
 * no Authorization header  -> 404 {"detail":"Api key not provided."}   (a 404, not a 401)
 * Token bogus123           -> 401 {"detail":"Invalid token."}
 * ```
 *
 * An unknown path under `/v1/` answers an HTML 404, so JSON-versus-HTML is what tells "the
 * API answered" apart from "something else answered". {@link errorText} reads the vendor's
 * own sentence; validation failures (400) are DRF-style field maps such as
 * `{"name": ["This field is required."]}` and are flattened by {@link formatClientifyError}.
 *
 * ## Pagination
 *
 * Lists answer `{count, next, previous, results}`, at most 100 per page, `next` being a
 * full URL carrying `?page=N`. List actions take a `page` number.
 */

export const API_BASE = "https://api.clientify.net";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** A pre-built multipart body; content-type (with its boundary) is left to `fetch`. */
  form?: FormData;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** The vendor's own sentence from an error body (`detail`, `message` or `error`). */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const b = body as Record<string, unknown>;
  for (const k of ["detail", "message", "error"]) {
    if (typeof b[k] === "string" && b[k]) return b[k] as string;
  }
  return undefined;
}

/** Flatten a DRF-style `{field: ["msg"]}` validation body into `field: msg; field: msg`. */
function flattenFields(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    const msg = Array.isArray(v) ? v.map(String).join(", ") : typeof v === "string" ? v : undefined;
    if (msg) parts.push(`${k}: ${msg}`);
  }
  return parts.length ? parts.join("; ") : undefined;
}

export function formatClientifyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON */ }
  const head = `Clientify ${status} for ${method} ${path}`;
  const text = errorText(parsed) ?? flattenFields(parsed);
  if (text) return truncate(`${head}: ${text}`, 1000);
  return `${head}: ${truncate(raw)}`;
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** A `json` param arrives as a value or, from a text box, as a string — accept both. */
export function asJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    throw new Error("Expected valid JSON");
  }
}

/** A `json` param that must be an object (extra query filters / extra body fields). */
export function asObject(value: unknown, what: string): Record<string, unknown> {
  const v = asJson(value);
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) throw new Error(`${what} must be a JSON object`);
  return v as Record<string, unknown>;
}

export class ClientifyClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form) {
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatClientifyError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
