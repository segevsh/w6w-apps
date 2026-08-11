/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: page("customers", []) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/customers");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext, Param } from "@w6w/types";

export const API_ROOT = "https://api.housecallpro.com";

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
      const last = calls[calls.length - 1];
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${last.method} ${url} — no queued response`,
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

/**
 * Housecall Pro's core pagination envelope: the plural resource name, beside
 * `page` / `page_size` / `total_pages` / `total_items`.
 */
export function page<T>(
  collectionKey: string,
  items: T[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    page: 1,
    page_size: 50,
    total_pages: 1,
    total_items: items.length,
    [collectionKey]: items,
    ...extra,
  };
}

/**
 * The price-book envelope: `data` instead of the plural key, and `total_count` /
 * `total_pages_count` instead of `total_items` / `total_pages`.
 */
export function priceBookPage<T>(items: T[]): Record<string, unknown> {
  return {
    object: "list",
    page: 1,
    page_size: 50,
    total_pages_count: 1,
    total_count: items.length,
    data: items,
    url: "/api/price_book/materials",
  };
}

/** The 401 body Housecall Pro returns, byte-for-byte as measured on the wire. */
export function unauthorizedBody(): Record<string, unknown> {
  return { message: "Unauthorized" };
}

/** `components.schemas.ErrorResponse` — the `{error: {message}}` shape. */
export function errorBody(message: string): Record<string, unknown> {
  return { error: { message } };
}

/** The query string of a recorded call, as a plain object. Repeated keys are joined. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) {
    out[k] = k in out ? `${out[k]},${v}` : v;
  }
  return out;
}

/** Every value for one query key, in order — the way an array parameter arrives. */
export function queryAll(url: string, key: string): string[] {
  return new URL(url).searchParams.getAll(key);
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The parsed JSON body of a recorded call. */
export function bodyOf(call: { body: string | null }): Record<string, unknown> {
  return JSON.parse(call.body ?? "{}") as Record<string, unknown>;
}

/**
 * Read a `select` / `multiselect` param's values.
 *
 * `Param.options` is `Option[] | DynamicOptions`; every option list in this app
 * is static, and this narrows to that case rather than casting at each call
 * site. An unexpected dynamic list reads as `[]`, which fails the assertion
 * loudly instead of passing on a cast.
 */
export function optionValues(param: Param | undefined): string[] {
  const options = param?.options;
  if (!Array.isArray(options)) return [];
  return options.map((o) => String(o.value));
}
