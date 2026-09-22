/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: { pagination, result: [] } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.squarespace.com/1.0/commerce/orders");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.squarespace.com";

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
    else if (Array.isArray(raw)) {
      for (const [k, v] of raw) headers[String(k).toLowerCase()] = String(v);
    } else if (raw && typeof raw === "object") {
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

/** A ctx that also carries invocation metadata, for the two idempotent writes. */
export function mockCtxWithInvocation(
  responses: MockResponse[] = [],
  invocationId = "inv-0123456789abcdef",
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { invocation?: unknown }).invocation = { invocationId, trigger: "run" };
  return mock;
}

/**
 * Squarespace's error envelope, in the exact shape observed live on 2026-09-22:
 * `{"type","subtype","message","details","contextId"}`.
 */
export function errorBody(
  type: string,
  options: { subtype?: string | null; message?: string; details?: unknown; contextId?: string } =
    {},
): Record<string, unknown> {
  return {
    type,
    subtype: options.subtype ?? null,
    message: options.message ?? "You are not authorized to do that.",
    details: options.details ?? null,
    contextId: options.contextId ?? "01J8Z0V4K5F5F5F5F5F5F5F5F5F",
  };
}

/** The `pagination` object every list response carries. */
export function pagination(
  overrides: { hasNextPage?: boolean; nextPageCursor?: string; nextPageUrl?: string } = {},
): Record<string, unknown> {
  return {
    hasNextPage: overrides.hasNextPage ?? false,
    nextPageCursor: overrides.nextPageCursor ?? "",
    nextPageUrl: overrides.nextPageUrl ?? "",
  };
}

/** The query string of a recorded call, as a plain object (repeated keys become arrays). */
export function queryOf(url: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of new URL(url).searchParams) {
    const existing = out[k];
    if (existing === undefined) out[k] = v;
    else if (Array.isArray(existing)) existing.push(v);
    else out[k] = [existing, v];
  }
  return out;
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The parsed JSON body of a recorded call. */
export function bodyOf(call: CallRecord): Record<string, unknown> {
  return JSON.parse(call.body ?? "{}") as Record<string, unknown>;
}

/** A UUID v4, for asserting that an idempotency key is freshly minted. */
export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
