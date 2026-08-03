import type { HookContext } from "@w6w/types";

/**
 * Flodesk API v1.
 *
 * Every fact in this file was read off Flodesk's own OpenAPI 3 document on
 * 2026-08-03. That document is not published at a `.json` URL — it is embedded
 * in the Redoc bundle served at <https://developers.flodesk.com/> as the
 * `__redoc_state.spec.data` object, which is the authoritative machine-readable
 * source and what this app was built against. `/openapi.json`, `/reference` and
 * `/api-reference` on that host all answer 403.
 *
 * The document declares exactly one server:
 *
 *   `{ "url": "https://api.flodesk.com/v1", "description": "Default server" }`
 *
 * so there is a single global host, no per-account subdomain and no regional
 * split — which is why `network.allow` has one entry.
 */
export const API_URL = "https://api.flodesk.com/v1";

/**
 * The OAuth 2.0 endpoints live on the SAME host but OUTSIDE the `/v1` prefix
 * (`https://api.flodesk.com/oauth2/...`), so they are derived from the API host
 * rather than from `API_URL`.
 */
export const OAUTH_BASE = "https://api.flodesk.com/oauth2";

/**
 * Flodesk asks for a descriptive `User-Agent` in every documented example —
 * `-H "User-Agent: Your App Name (www.yourapp.com)"` appears on the API-key
 * snippet, the OAuth token exchange and the refresh call alike. It is a
 * courtesy/identification header, never a credential, so it is set here in the
 * shared client rather than in `sign`. Note Flodesk's own example carries no URL
 * scheme (`(www.yourapp.com)`, not `https://...`), and neither does this one —
 * the value names a host, it does not request one.
 *
 * Note it may not survive every host: `User-Agent` is a forbidden header name
 * under the browser fetch spec, so a strictly spec-compliant `ctx.fetch` will
 * drop it. Deno's fetch honours it. Nothing depends on it either way — Flodesk
 * documents no behaviour that changes when it is absent.
 */
export const USER_AGENT = "w6w (w6w.dev)";

/**
 * Flodesk's page envelope, returned as `meta` on every paginated list.
 * `page`/`per_page` are the request echo; `total_pages`/`total_items` are the
 * counts. Offset pagination throughout — there are no cursors anywhere in the
 * document.
 */
export interface FlodeskMeta {
  page: number;
  total_pages: number;
  per_page: number;
  total_items: number;
}

/** The shape every paginated list endpoint returns: `{ meta, data }`. */
export interface FlodeskList<T = unknown> {
  meta?: FlodeskMeta;
  data?: T[];
}

/**
 * Query params shared by the offset-paginated list endpoints that use
 * snake_case. `GET /workflows` is the one exception — see {@link WORKFLOW_PAGE_PARAMS}.
 */
export interface PageInput {
  page?: number;
  perPage?: number;
}

/** Map the shared page inputs onto Flodesk's `page` / `per_page` names. */
export function pageQuery(input: PageInput): Record<string, number | undefined> {
  return { page: input.page, per_page: input.perPage };
}

/**
 * The `Param[]` fragment the snake_case list actions reuse.
 *
 * Documented defaults, verbatim: "The page number. Defaults to 1." and "The
 * number of records to be returned on each page. Defaults to 20. Maximum 100."
 */
export const PAGE_PARAMS = [
  {
    key: "page",
    label: "Page",
    type: "number" as const,
    hint: "1-based page number. Flodesk defaults to 1.",
    validation: { integer: true, min: 1 },
  },
  {
    key: "perPage",
    label: "Per page",
    type: "number" as const,
    hint: "Records per page. Flodesk defaults to 20, maximum 100.",
    validation: { integer: true, min: 1, max: 100 },
  },
];

/**
 * `GET /workflows` takes **`perPage`, not `per_page`** — a genuine
 * inconsistency in Flodesk's own document (every other list endpoint uses
 * `per_page`), and its default is 10 rather than 20. Reproduced exactly as
 * documented; normalising it would break the call.
 */
export const WORKFLOW_PAGE_PARAMS = [
  {
    key: "page",
    label: "Page",
    type: "number" as const,
    hint: "1-based page number. Defaults to 1.",
    validation: { integer: true, min: 1 },
  },
  {
    key: "perPage",
    label: "Per page",
    type: "number" as const,
    hint:
      "Records per page. Defaults to 10. Sent as `perPage` — this endpoint uses camelCase where the rest of the API uses `per_page`.",
    validation: { integer: true, min: 1 },
  },
];

/** The `output` fragment every paginated list action reuses. */
export const PAGE_OUTPUT = [
  { key: "meta", type: "object" as const, label: "Pagination envelope" },
];

/**
 * Flodesk's rate-limit headers, documented under "Rate Limiting":
 *
 *   X-Fd-RateLimit-Limit: 100
 *   X-Fd-RateLimit-Remaining: 68
 *
 * The published allowances are 100 requests/minute on every endpoint, and 20
 * requests/minute on `POST /subscribers/batch` (which carries up to 50
 * subscribers per call, so ~1,000 upserts/minute). Exceeding either answers 429.
 *
 * There is no documented reset header — no `X-Fd-RateLimit-Reset`, no
 * `Retry-After` — so a reading yields headroom but never a reset time. Nothing
 * is inferred: the window is stated as "per minute" in prose, which is not the
 * same as knowing when the current one ends.
 */
export interface RateLimitReading {
  limit?: number;
  remaining?: number;
}

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Read `X-Fd-RateLimit-*` off a response. Absent headers yield `undefined`. */
export function readRateLimit(headers: Headers): RateLimitReading {
  return {
    limit: num(headers.get("x-fd-ratelimit-limit")),
    remaining: num(headers.get("x-fd-ratelimit-remaining")),
  };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * No `Authorization` header is ever set here — the runtime routes the request
 * through the auth `sign` hook, which is the only code handed the credential.
 * Both of this app's auth methods stamp `Authorization` there.
 */
export class FlodeskClient {
  constructor(private ctx: HookContext) {}

  /** Build an absolute v1 URL. Exposed so auth hooks can reach it without a client. */
  static url(path: string): string {
    return path.startsWith("http") ? path : `${API_URL}${path}`;
  }

  /** Percent-encode a path segment — subscriber ids arrive as raw email addresses. */
  static seg(value: string): string {
    return encodeURIComponent(value);
  }

  /** Issue a request and return the raw `Response`, without status checking. */
  send(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = new URL(FlodeskClient.url(path));
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": USER_AGENT,
      ...options.headers,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // Flodesk: "Parameters must be serialized in JSON and passed in the
      // request body (not in the query string or form parameters)."
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    return this.ctx.fetch(url.toString(), init);
  }

  /** Issue a request, throw on a non-2xx, and decode the JSON body. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      const method = options.method ?? "GET";
      throw new Error(
        `Flodesk ${res.status} ${res.statusText} for ${method} ${path}: ${detail}`,
      );
    }
    // `DELETE /webhooks/{id}` and both workflow-membership writes answer 204.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
