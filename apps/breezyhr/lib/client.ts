import type { HookContext } from "@w6w/types";

/**
 * Breezy HR public API (v3) client.
 *
 * Verified on 2026-10-06 against the OpenAPI 3.1 documents embedded in every page of
 * `developer.breezy.hr/reference/*.md` (`servers: https://api.breezy.hr/v3`, listed in
 * `developer.breezy.hr/llms.txt`) and live unauthenticated probes of `api.breezy.hr`.
 *
 * ## One host, one credential, no envelope
 *
 * Every call goes to `https://api.breezy.hr/v3`. The token (a Personal Access Token or a
 * `/signin` session token) is stamped on by the Auth `sign` hook. Success bodies are the bare
 * resource or array; there is no `{data}` wrapper, except the two paginated company-wide
 * endpoints (candidate search, webhook list). Failures are
 * `{ "error": { "type": "...", "message": "..." } }` and `type` is the stable part.
 *
 * ## Things that are not what they look like
 *
 * - A bad or missing token is **HTTP 400** (`invalidAccessToken` / `missingAccessToken`), not
 *   401. The verdict is read from `error.type`.
 * - Several writes answer `204` with no body (stage change, state change, scorecard).
 * - Pagination is opt-in and per-endpoint: `page_size` (max 50) + `page` on position and
 *   candidate lists, `skip` on activity streams and conversations.
 */
export const API_HOST = "api.breezy.hr";
export const API_BASE = `https://${API_HOST}/v3`;

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Accept a list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Anything
 * unparseable passes through so Breezy, not this app, rejects it.
 */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** `undefined` when the object has no defined member, else the compacted object. */
export function compactOrUndefined(
  obj: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const out = compact(obj);
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Breezy's error envelope. */
export interface BreezyErrorBody {
  error?: { type?: string; message?: string };
}

/** The vendor's `error` object out of a parsed body, when it is one. */
export function vendorError(body: unknown): { type?: string; message?: string } | undefined {
  if (body && typeof body === "object") {
    const err = (body as BreezyErrorBody).error;
    if (err && typeof err === "object") return err;
  }
  return undefined;
}

/** One human line from a parsed error body: `type: message`. */
export function errorText(body: unknown, raw = ""): string {
  const e = vendorError(body);
  if (e && (e.type || e.message)) {
    return [e.type, e.message].filter(Boolean).join(": ");
  }
  return raw.trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export interface Reply<T> {
  status: number;
  data: T;
  headers: Headers;
}

export class BreezyClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request; returns status, parsed JSON (`{}` for an empty body) and headers. */
  async send<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<Reply<T>> {
    const url = `${API_BASE}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }

    if (!res.ok) {
      const reset = res.headers.get("x-ratelimit-reset");
      throw new Error(
        `Breezy HR ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${
          res.status === 429 && reset ? ` (rate limit resets: ${reset})` : ""
        }`,
      );
    }
    return { status: res.status, data: (parsed ?? {}) as T, headers: res.headers };
  }

  async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    return (await this.send<T>(method, path, options)).data;
  }

  /** A list call that returns a bare array. Anything else is returned as `[]`. */
  async array<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T[]> {
    const data = await this.request<unknown>("GET", path, options);
    return Array.isArray(data) ? data as T[] : [];
  }
}

/** The path prefix every company-scoped route shares. */
export const company = (companyId: string) => `/company/${seg(companyId)}`;
export const position = (companyId: string, positionId: string) =>
  `${company(companyId)}/position/${seg(positionId)}`;
export const candidate = (companyId: string, positionId: string, candidateId: string) =>
  `${position(companyId, positionId)}/candidate/${seg(candidateId)}`;
