import type { HookContext } from "@w6w/types";

/**
 * EZ Texting API v1 REST client.
 *
 * Every path, verb, query parameter and body field in this app was read off the OpenAPI document
 * embedded in the SSR props of `https://developers.eztexting.com/reference/*` (the `ssr-props`
 * script tag; 57 operations, `servers[0].url` is the bare host `a.eztexting.com`), cross-checked
 * against the vendor's Authentication / Pagination / Errors / Rate Limits guides and live
 * unauthenticated probes of `https://a.eztexting.com/v1` on 2026-10-06.
 *
 * - **One host, one prefix.** `https://a.eztexting.com/v1`. The pre-2025 "legacy" API is retired
 *   (the docs carry a Legacy Migration Guide) and is never called.
 * - **Page envelope.** Collections answer `{content, pageable, totalPages, totalElements,
 *   numberOfElements, first, last}`; {@link EzTextingClient.page} normalises it.
 * - **Bodies are optional.** Most writes answer `200` or `201` with `{id}` or nothing at all, so
 *   {@link EzTextingClient.json} tolerates an empty body rather than assuming JSON.
 * - **Errors** are `{status, title, detail, errors: [{code, message}]}`, with HTTP `429` plus an
 *   `X-Rate-Limit-Retry-After-Milliseconds` header at the documented 200 requests per minute.
 *
 * Nothing here sets a credential header: `ctx.fetch` routes through the Auth `sign` hook.
 */

export const API_BASE = "https://a.eztexting.com";
export const API_PREFIX = "/v1";

export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The page envelope every collection endpoint answers with. */
export interface Page<T> {
  content: T[];
  totalPages?: number;
  totalElements?: number;
  numberOfElements?: number;
}

/** EZ Texting's error envelope. */
export interface ApiError {
  status?: number;
  title?: string;
  detail?: string;
  errors?: Array<{ code?: string; title?: string; message?: string }>;
}

/** Drop keys the caller left unset. `false` and `0` survive; `undefined`, `null` and `""` do not. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Escape a caller-supplied path segment (phone numbers carry `+`, keywords carry anything). */
export function encodePathSegment(value: string): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/**
 * Accept a list-shaped param however the form handed it over: a real array, or the
 * comma-separated string someone typed into a single field.
 */
export function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = (Array.isArray(value) ? value : String(value).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export function parseError(text: string): ApiError | undefined {
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as ApiError;
  } catch {
    // Not JSON — the caller keeps the raw text.
  }
  return undefined;
}

/** The most specific human message in an error body. */
export function errorMessage(err: ApiError | undefined): string | undefined {
  return err?.errors?.[0]?.message ?? err?.detail ?? err?.title;
}

export function formatEzTextingError(
  status: number,
  method: string,
  path: string,
  bodyText: string,
  retryAfterMs?: string | null,
): string {
  const err = parseError(bodyText);
  const head = `EZ Texting returned ${status} for ${method} ${path}`;
  const detail = errorMessage(err) ?? (err ? undefined : truncate(bodyText, 300));
  const advice = (() => {
    if (status === 401) return "the credential was rejected — check the username and password";
    if (status === 403) return "the credential is valid but lacks permission for this operation";
    if (status === 404) return "the resource was not found — check the ID or phone number";
    if (status === 429) {
      return `rate limit reached (200 requests/minute)${
        retryAfterMs ? `; retry after ${retryAfterMs} ms` : ""
      }`;
    }
    return undefined;
  })();
  return truncate([head, detail, advice].filter(Boolean).join(": "), 1000);
}

export class EzTextingClient {
  constructor(private ctx: HookContext) {}

  /** The parsed JSON body, or `undefined` when the response carries none. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined;
    const text = await res.text();
    if (!text.trim()) return undefined;
    return JSON.parse(text) as T;
  }

  async page<T = unknown>(path: string, options: RequestOptions = {}): Promise<Required<Page<T>>> {
    const body = await this.json<Partial<Page<T>>>(path, options);
    const content = Array.isArray(body?.content) ? body.content : [];
    return {
      content,
      totalPages: body?.totalPages ?? 0,
      totalElements: body?.totalElements ?? content.length,
      numberOfElements: body?.numberOfElements ?? content.length,
    };
  }

  /** For endpoints whose answer is "it worked" and nothing else. Returns the HTTP status. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    await res.body?.cancel();
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatEzTextingError(
          res.status,
          method,
          url.pathname,
          detail,
          res.headers.get("x-rate-limit-retry-after-milliseconds"),
        ),
      );
    }
    return res;
  }
}
