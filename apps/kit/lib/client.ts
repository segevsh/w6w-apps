import type { HookContext } from "@w6w/types";

/**
 * Kit API v4. ConvertKit rebranded to Kit; `developers.convertkit.com` now
 * 301s to `developers.kit.com`, and the old v3 API (`api.convertkit.com/v3`,
 * credentials as `api_key`/`api_secret` QUERY PARAMETERS) is deprecated and
 * awaiting sunset. This app is built entirely on v4, which takes the
 * credential in an `X-Kit-Api-Key` HEADER — a header is the reason to prefer
 * v4 even setting the deprecation aside, since a query-string secret leaks
 * into logs, proxies and referrers.
 */
export const API_URL = "https://api.kit.com/v4";

/**
 * Kit v4 list responses are cursor-paginated. Every list endpoint returns its
 * rows under a resource-named key plus a `pagination` envelope, so the generic
 * list type parameterizes the wrapping property name.
 */
export interface KitPagination {
  has_previous_page: boolean;
  has_next_page: boolean;
  start_cursor: string;
  end_cursor: string;
  per_page: number;
}

export type KitList<K extends string, T = unknown> =
  & { pagination?: KitPagination; total_count?: number }
  & { [P in K]: T[] };

/** Query params shared by every cursor-paginated v4 list endpoint. */
export interface PageInput {
  after?: string;
  before?: string;
  perPage?: number;
  includeTotalCount?: boolean;
}

/** Map the shared page inputs onto Kit's query-parameter names. */
export function pageQuery(input: PageInput): Record<string, string | number | boolean | undefined> {
  return {
    after: input.after,
    before: input.before,
    per_page: input.perPage,
    include_total_count: input.includeTotalCount,
  };
}

/** The `Param[]` fragment every list action reuses, so paging looks identical everywhere. */
export const PAGE_PARAMS = [
  {
    key: "perPage",
    label: "Per page",
    type: "number" as const,
    hint: "Results per page. Kit defaults to 500, maximum 1000.",
  },
  {
    key: "after",
    label: "After cursor",
    type: "string" as const,
    hint: "Pass the previous response's `pagination.end_cursor` to fetch the next page.",
  },
  {
    key: "before",
    label: "Before cursor",
    type: "string" as const,
    hint: "Pass the previous response's `pagination.start_cursor` to fetch the previous page.",
  },
  {
    key: "includeTotalCount",
    label: "Include total count",
    type: "boolean" as const,
    hint: "Adds `total_count` to the response. Slow — request it on the first page only.",
  },
];

/** The `output` fragment every list action reuses. */
export const PAGE_OUTPUT = [
  { key: "pagination", type: "object" as const, label: "Cursor pagination envelope" },
];

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Note we never set the `X-Kit-Api-Key` header
 * here — the runtime routes the request through the auth `sign` hook, which
 * injects it.
 */
export class KitClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Kit ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
