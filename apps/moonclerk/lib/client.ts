import type { HookContext } from "@w6w/types";

/**
 * MoonClerk public API (v1) client.
 *
 * Verified on 2026-10-06 against the vendor's reference (`github.com/moonclerk/developer`,
 * `api/README.md` and `api/v1/{forms,customers,payments}.md`) and live unauthenticated probes
 * of `api.moonclerk.com`.
 *
 * ## One host, one credential, read only
 *
 * Every call is a `GET` to `https://api.moonclerk.com`. The API key is stamped on by the Auth
 * `sign` hook (`Authorization: Token token=<key>`); the version and format ride in
 * `Accept: application/vnd.moonclerk+json;version=1`. The API is documented as READ ONLY, so
 * this app has no write actions.
 *
 * ## Things that are not what they look like
 *
 * - "Customers" are what the MoonClerk dashboard calls "Plans" (customer + subscription + plan).
 * - A bad or missing key is HTTP 401 with a plain-text (`text/plain`) body
 *   `HTTP Token: Access denied.` — not JSON, so there is no error code to read.
 * - Lists are wrapped in an envelope (`{ "customers": [...] }`) and paged with `count` (1-100,
 *   default 10) and `offset`; there is no total or cursor in the response.
 */
export const API_HOST = "api.moonclerk.com";
export const API_BASE = `https://${API_HOST}`;
export const ACCEPT = "application/vnd.moonclerk+json;version=1";

/** The text MoonClerk answers a missing or rejected key with. */
export const DENIED_TEXT = "access denied";

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
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

/** True when a response body is MoonClerk's key-rejected message. */
export function isAccessDenied(text: string): boolean {
  return text.toLowerCase().includes(DENIED_TEXT);
}

export interface Page<T> {
  items: T[];
  /** Offset of the next page, present only when a full page came back. */
  nextOffset?: number;
}

export class MoonClerkClient {
  constructor(private readonly ctx: HookContext) {}

  /** `GET path` → the parsed JSON body. Throws a one-line error on any non-2xx. */
  async get<T = Record<string, unknown>>(path: string, query?: Query): Promise<T> {
    const res = await this.ctx.fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      method: "GET",
      headers: { accept: ACCEPT },
    });
    const text = await res.text();
    if (!res.ok) {
      const detail = isAccessDenied(text)
        ? "the API key was rejected (HTTP Token: Access denied.)"
        : text.trim().slice(0, 200);
      throw new Error(`MoonClerk GET ${path} failed: HTTP ${res.status} — ${detail}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`MoonClerk GET ${path} returned a non-JSON body: ${text.slice(0, 120)}`);
    }
  }

  /** A list call: unwraps `{ [key]: [...] }` and reports the next offset on a full page. */
  async list<T = Record<string, unknown>>(
    path: string,
    key: string,
    query: Query & { count?: number; offset?: number },
  ): Promise<Page<T>> {
    const body = await this.get<Record<string, unknown>>(path, query);
    const items = Array.isArray(body[key]) ? body[key] as T[] : [];
    const size = query.count ?? DEFAULT_COUNT;
    const full = items.length >= size;
    return { items, ...(full ? { nextOffset: (query.offset ?? 0) + items.length } : {}) };
  }

  /** A single-resource call: unwraps `{ [key]: {...} }`. */
  async one<T = Record<string, unknown>>(path: string, key: string): Promise<T> {
    const body = await this.get<Record<string, unknown>>(path);
    const item = body[key];
    if (!item || typeof item !== "object") {
      throw new Error(`MoonClerk GET ${path} returned no "${key}" object`);
    }
    return item as T;
  }
}

/** MoonClerk's documented default page size. */
export const DEFAULT_COUNT = 10;
