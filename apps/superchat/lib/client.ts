import type { HookContext } from "@w6w/types";

/**
 * Superchat's public API. The reference (developers.superchat.com) names
 * `https://api.superchat.com/v1.0` as the server; `api.superchat.de/v1.0` answers
 * identically, but `/v1` without the `.0` is a 404 on both hosts — the version
 * segment is literally `v1.0`.
 */
export const API_URL = "https://api.superchat.com/v1.0";

export type QueryValue = string | number | boolean | string[] | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Percent-encode one path segment (ids are opaque strings). */
export function seg(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error("Superchat: a required id was empty");
  return encodeURIComponent(s);
}

interface ApiError {
  title?: string | null;
  detail?: string | null;
  status_code?: number;
}

/**
 * Build a message from a failed response. Superchat answers a rejected request
 * with `{"errors":[{"title","detail","url","docs","status_code"}]}` — but the
 * auth failures carry NO body at all: a missing key is an empty `401`, a wrong
 * key an empty `403` (measured live, `content-length: 0`), so those two are
 * named from the status code alone.
 */
export function formatError(status: number, statusText: string, text: string): string {
  if (status === 401) return "401 — no API key reached the request";
  if (status === 403) return "403 — the API key was rejected (wrong key, or no access)";
  if (status === 429) {
    return "429 — rate limit hit (2500 requests per 5 minutes, shared across the workspace)";
  }
  try {
    const parsed = JSON.parse(text) as { errors?: ApiError[] };
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      const lines = parsed.errors.map((e) => [e.title, e.detail].filter(Boolean).join(": "));
      return `${status} ${lines.filter(Boolean).join("; ") || statusText}`;
    }
  } catch {
    // fall through to the raw body
  }
  return `${status} ${statusText}${text ? ` — ${text.slice(0, 300)}` : ""}`.trim();
}

/**
 * Cursor paging, shared by every list endpoint. `after`/`before` take an object
 * ID (the previous page's `nextCursor`), and the API accepts only one of them.
 */
export interface PageInput {
  limit?: number;
  after?: string;
  before?: string;
}

export function pageQuery(input: PageInput): Record<string, QueryValue> {
  if (input.after && input.before) {
    throw new Error("Superchat: pass only one of `after` and `before`, not both");
  }
  return { limit: input.limit, after: input.after, before: input.before };
}

/** What every list action returns: the raw page plus its forward cursor. */
export interface ListResult<T = unknown> {
  url?: string;
  results: T[];
  pagination?: {
    next_cursor?: string | null;
    previous_cursor?: string | null;
    next_url?: string | null;
    previous_url?: string | null;
  };
  nextCursor: string | null;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `X-API-KEY` — the runtime routes the
 * request through the auth `sign` hook, which injects it.
 */
export class SuperchatClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, item);
      } else url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers: { accept: "application/json" } };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `Superchat ${method} ${url.pathname}: ${formatError(res.status, res.statusText, text)}`,
      );
    }
    if (!text) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Superchat ${method} ${url.pathname}: HTTP ${res.status} was not JSON`);
    }
  }

  async list<T = unknown>(
    path: string,
    input: PageInput,
    extra: Record<string, QueryValue> = {},
  ): Promise<ListResult<T>> {
    const page = await this.request<Omit<ListResult<T>, "nextCursor">>(path, {
      query: { ...pageQuery(input), ...extra },
    });
    return { ...page, nextCursor: page?.pagination?.next_cursor ?? null };
  }
}
