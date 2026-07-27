import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.pipedrive.com/v1";

/**
 * Pipedrive wraps every response in an envelope:
 *
 * ```json
 * { "success": true, "data": { ... }, "additional_data": { "pagination": {...} } }
 * ```
 *
 * `success` is `false` (with an HTTP 200 in a few older endpoints) when the call
 * failed, so the client checks both the status code and this flag. List
 * endpoints return `data: null` — not `[]` — when there is nothing to return.
 */
export interface PipedriveEnvelope<T = unknown> {
  success: boolean;
  data: T;
  additional_data?: {
    pagination?: {
      start?: number;
      limit?: number;
      more_items_in_collection?: boolean;
      next_start?: number;
    };
    [k: string]: unknown;
  };
  error?: string;
  error_info?: string;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets auth — the runtime routes the
 * request through the active auth method's `sign` hook, which either appends the
 * `api_token` query param (API-token auth) or sets a `Bearer` header (OAuth2).
 */
export class PipedriveClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<PipedriveEnvelope<T>> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let parsed: PipedriveEnvelope<T> | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as PipedriveEnvelope<T>;
      } catch { /* non-JSON body handled below */ }
    }

    if (!res.ok || parsed?.success === false) {
      const detail = parsed?.error_info ?? parsed?.error ?? text;
      throw new Error(
        `Pipedrive ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }

    // A successful call always carries the JSON envelope; the only time it does
    // not is an empty 2xx (rare here), which we normalize to an empty success.
    return parsed ?? ({ success: true, data: null as T });
  }
}

/**
 * Drop `undefined`/`null`/`""` entries from a request body so an action can
 * spread its optional inputs without a conditional per field. Pipedrive treats
 * an explicit `null` as "clear this field", which is not what an unset optional
 * param means — so unset params must be omitted, not sent as null.
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(body) as Array<keyof T>) {
    const v = body[key];
    if (v === undefined || v === null || v === "") continue;
    out[key] = v;
  }
  return out;
}
