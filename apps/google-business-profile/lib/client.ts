import type { HookContext } from "@w6w/types";

/**
 * Google split the old "My Business" API into one service per surface, each
 * on its own hostname (verified live against each `$discovery/rest` document
 * on 2026-08-15). Every action picks the base URL its resource lives under —
 * there is no single "the API host" the way most apps have.
 */
export const ACCOUNT_MANAGEMENT_URL = "https://mybusinessaccountmanagement.googleapis.com/v1";
export const BUSINESS_INFORMATION_URL = "https://mybusinessbusinessinformation.googleapis.com/v1";
export const QANDA_URL = "https://mybusinessqanda.googleapis.com/v1";
export const PLACE_ACTIONS_URL = "https://mybusinessplaceactions.googleapis.com/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON object → JSON-encoded body. `undefined`/`null` → no body. */
  body?: unknown;
  /** Additional request headers. */
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is applied by the runtime through the
 * auth `sign` hook, so we never touch Authorization here.
 */
export class GoogleBusinessProfileClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    baseUrl: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = "application/json";
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const init: RequestInit = { method: options.method ?? "GET", headers, body };
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Google Business Profile ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    // A body-less 200 (e.g. an empty ListAccountsResponse) is valid JSON `{}`,
    // but guard against a genuinely empty body anyway.
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

/**
 * Resource names throughout these APIs are `accounts/{id}`, `locations/{id}`,
 * etc. Callers are expected to hand us the bare id (matching the pack's
 * convention elsewhere — see Google Calendar's `calendarId`); these helpers
 * are forgiving of a caller who already includes the prefix, so a value
 * copied from a previous action's output (which returns the full resource
 * name) still works.
 */
export function accountName(id: string): string {
  return id.startsWith("accounts/") ? id : `accounts/${id}`;
}

export function locationName(id: string): string {
  return id.startsWith("locations/") ? id : `locations/${id}`;
}
