/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: listPage([{ id: 1 }]) }]);
 *   await productSearch.execute({ limit: 50 }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/api/v3/1003/products");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 *
 * One Ecwid-specific twist: the client builds its URLs around the
 * `__storeId__` placeholder that the auth `sign` hook fills in at run time
 * (see `lib/client.ts`), and `sign` does not run in a unit test. {@link urlOf}
 * therefore performs that substitution — the same string `sign` would produce —
 * so `pathOf` and `queryOf` read like the real request.
 */
import type { HookContext } from "@w6w/types";

export const API_URL = "https://app.ecwid.com";
export const API_PREFIX = "/api/v3";
export const API_ROOT = `${API_URL}${API_PREFIX}`;

/** The store id these tests pretend to be connected to. */
export const TEST_STORE_ID = "1003";

/** The placeholder `sign` substitutes; also asserted against in the auth tests. */
export const STORE_PLACEHOLDER = "__storeId__";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (the bodyless 403 case). */
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
    const method = (init?.method ?? "GET").toUpperCase();
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

    calls.push({ url, method, headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${method} ${url} — no queued response`,
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

/** The URL with the store placeholder resolved, exactly as `sign` would leave it. */
export function urlOf(url: string): string {
  return url.replace(STORE_PLACEHOLDER, TEST_STORE_ID);
}

/** The path of a recorded call, with the store id filled in. */
export function pathOf(url: string): string {
  return new URL(urlOf(url)).pathname;
}

/** The query string of a recorded call, as a plain object. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(urlOf(url)).searchParams) out[k] = v;
  return out;
}

/** Ecwid's search envelope, in the exact shape every search page documents. */
export function listPage<T>(
  items: T[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    total: items.length,
    count: items.length,
    offset: 0,
    limit: 100,
    items,
    ...extra,
  };
}

/** Ecwid's documented failure body. */
export function errorBody(errorCode: string, errorMessage: string): Record<string, unknown> {
  return { errorCode, errorMessage };
}
