/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: page([]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://open-api.scoreapp.com/scorecards");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://open-api.scoreapp.com";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body. String -> verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export function mockCtx(responses: MockResponse[] = []): MockCtx {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const logs: MockCtx["logs"] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
    else if (Array.isArray(raw)) { for (const [k, v] of raw) headers[k.toLowerCase()] = String(v); }
    else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null
      ? null
      : typeof init.body === "string"
      ? init.body
      : String(init.body);

    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${
          calls[calls.length - 1].method
        } ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status: next.status ?? 200,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}

/** ScoreApp's non-paginated envelope: `{"data": …}`. */
export function envelope<T>(data: T): Record<string, unknown> {
  return { data };
}

/**
 * ScoreApp's Laravel page envelope, shaped like the vendor's own example.
 *
 * Trimmed to the members this app reads — `data` plus the `links`/`meta` a paging
 * workflow walks. The vendor's `meta.links` array of `{url, label, active}` rows
 * is omitted deliberately: nothing in this app reads it, and a fixture that grows
 * members nobody asserts on is a fixture that hides a change.
 */
export function page<T>(rows: T[], extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    data: rows,
    links: { first: `${API_ROOT}?page=1`, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: rows.length ? 1 : 0,
      last_page: 1,
      path: API_ROOT,
      per_page: 100,
      to: rows.length,
      total: rows.length,
      ...extra,
    },
  };
}

/** ScoreApp's error envelope: `{"error": "<message>"}`, a bare string. */
export function errorBody(message: string): Record<string, unknown> {
  return { error: message };
}

/** The documented auth failure, exactly as the wire sends it. */
export const UNAUTHENTICATED_BODY = errorBody("Unauthenticated.");

/** Rate-limit headers, in the shape and casing the wire sends them. */
export function rateLimitHeaders(limit: number, remaining: number): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(remaining),
  };
}

/** The query string of a recorded call, as a plain object (repeated keys join with `,`). */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) {
    out[k] = k in out ? `${out[k]},${v}` : v;
  }
  return out;
}

/** Every value of one (possibly repeated) query parameter, in order. */
export function queryValuesOf(url: string, name: string): string[] {
  return new URL(url).searchParams.getAll(name);
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}
