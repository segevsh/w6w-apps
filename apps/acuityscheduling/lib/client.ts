import type { HookContext } from "@w6w/types";

export const API_URL = "https://acuityscheduling.com/api/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<
    string,
    string | number | boolean | undefined | null | Array<string | number>
  >;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch` for the Acuity Scheduling API v1. Never sets
 * Authorization — the runtime routes the request through the auth `sign`
 * hook, which injects the Basic (User ID + API Key) or Bearer (OAuth access
 * token) header, whichever the Connection uses.
 *
 * Acuity identifies objects by plain numeric IDs (unlike Calendly's absolute
 * `uri`s), so there is no URI/UUID normalization here — every action just
 * takes the ID directly.
 *
 * Array query params (`addonIDs`, `ignoreAppointmentIDs`) are serialized as
 * repeated `key[]=value` pairs, matching the PHP-style array encoding the
 * Acuity API expects.
 *
 * Errors come back as a small flat JSON object (`{ status_code, message,
 * error }`) rather than a HAL-ish shape; `request` surfaces the raw response
 * body in the thrown Error so a workflow can act on it.
 */
export class AcuityClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(`${k}[]`, String(item));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Acuity Scheduling ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }
}
