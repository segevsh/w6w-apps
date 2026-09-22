/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: listEnvelope("customers", []) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.gocardless.com/customers");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

/** The live origin. `sign` rewrites the hostname to sandbox for a sandbox Connection. */
export const API_ROOT = "https://api.gocardless.com";

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
        } ${url} — ` +
          "no queued response",
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

/** A ctx that also carries invocation metadata, for the four creating actions. */
export function mockCtxWithInvocation(
  responses: MockResponse[] = [],
  invocationId = "inv-0123456789abcdef",
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { invocation?: unknown }).invocation = { invocationId, trigger: "run" };
  return mock;
}

/** A single-resource response: `{"<resource>": {…}}`. */
export function envelope(resource: string, value: unknown): Record<string, unknown> {
  return { [resource]: value };
}

/** A list response: `{"<resource>": [...], "meta": {"cursors": {...}, "limit": n}}`. */
export function listEnvelope(
  resource: string,
  items: unknown[],
  cursors: { before?: string | null; after?: string | null; limit?: number } = {},
): Record<string, unknown> {
  return {
    [resource]: items,
    meta: {
      cursors: {
        before: cursors.before ?? null,
        after: cursors.after ?? null,
      },
      limit: cursors.limit ?? 50,
    },
  };
}

/** GoCardless's error envelope, in the exact shape the API documents it. */
export function errorBody(
  type: string,
  options: {
    code?: number;
    message?: string;
    errors?: Array<Record<string, unknown>>;
    requestId?: string;
  } = {},
): Record<string, unknown> {
  return {
    error: {
      type,
      code: options.code ?? 422,
      message: options.message ?? "Validation failed",
      documentation_url: "https://developer.gocardless.com/api-reference/#errors",
      request_id: options.requestId ?? "0f5b1c2e-0000-4000-8000-000000000000",
      errors: options.errors ?? [],
    },
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
