/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/catalog/products");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 *
 * Every context carries a Connection whose `display.storeHash` is
 * {@link STORE_HASH}, because that is where `lib/client.ts` reads the store hash
 * from — an Action never sees the credential.
 */
import type { HookContext } from "@w6w/types";

export const STORE_HASH = "abc123";
export const API_ROOT = `https://api.bigcommerce.com/stores/${STORE_HASH}`;

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. 204). String -> verbatim. */
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

/** Build a ctx. Pass `storeHash: null` to simulate a Connection that never recorded one. */
export function mockCtx(
  responses: MockResponse[] = [],
  options: { storeHash?: string | null } = {},
): MockCtx {
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

  const hash = options.storeHash === undefined ? STORE_HASH : options.storeHash;
  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    ...(hash === null ? {} : {
      connection: {
        id: "conn-1",
        app: "io.w6w.bigcommerce",
        auth: "access-token",
        owner: "user-1",
        state: "connected",
        createdAt: "2026-08-11T00:00:00.000Z",
        display: { storeHash: hash, storeName: "Acme" },
      },
    }),
  };

  return { ctx, calls, logs };
}

/** A v3 single-resource envelope: `{"data": …, "meta": {}}`. */
export function v3Envelope<T>(data: T): Record<string, unknown> {
  return { data, meta: {} };
}

/** A v3 collection envelope, with the pagination block the API really sends. */
export function v3Page<T>(
  data: T[],
  pagination: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    data,
    meta: {
      pagination: {
        total: data.length,
        count: data.length,
        per_page: 50,
        current_page: 1,
        total_pages: 1,
        links: { current: "?page=1&limit=50" },
        ...pagination,
      },
    },
  };
}

/** The v3 error body, in the exact shape observed on the wire. */
export function v3Error(status: number, title: string, errors?: Record<string, unknown>) {
  return {
    status,
    title,
    type: "https://developer.bigcommerce.com/api-docs/getting-started/api-status-codes",
    ...(errors ? { errors } : {}),
  };
}

/** The rate-limit headers BigCommerce puts on every response. */
export function rateLimitHeaders(
  left: number,
  quota = 150,
  resetMs = 15000,
  windowMs = 30000,
): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-rate-limit-requests-left": String(left),
    "x-rate-limit-requests-quota": String(quota),
    "x-rate-limit-time-reset-ms": String(resetMs),
    "x-rate-limit-time-window-ms": String(windowMs),
  };
}

/** The query string of a recorded call, as a plain object. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The parsed JSON body of a recorded call. */
export function bodyOf(call: CallRecord): unknown {
  return call.body === null ? undefined : JSON.parse(call.body);
}
