/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
 *   const result = await action.execute({ ... }, ctx);
 *   assertEquals(new URL(calls[0].url).pathname, "/forms");
 *
 * The mock queues responses one-per-fetch. Each fetch pops the next response;
 * if the queue is empty the test fails loudly (so a test that makes an
 * unexpected extra request surfaces the bug rather than hanging).
 *
 * `display` seeds `ctx.connection.display` — the redacted Connection metadata
 * this app's client reads the pinned `tally-version` from. It defaults to
 * absent, which is how the unpinned (header-omitted) path gets exercised.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object → JSON-encoded body. Undefined → no body. String → verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  /** Request body decoded as text (parsing left to the assertion). */
  body: string | null;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  /** Any log lines emitted by the hook, in order. */
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export interface MockOptions {
  /** Redacted connection display data, e.g. `{ apiVersion: "2025-02-01" }`. */
  display?: Record<string, unknown>;
}

/** Tally's paginated collection envelope. */
export function listBody(items: unknown[], extra: Record<string, unknown> = {}) {
  return { items, page: 1, limit: 50, total: items.length, hasMore: false, ...extra };
}

/** Parse a recorded request body as JSON. */
export function jsonBody(call: CallRecord): Record<string, unknown> {
  return JSON.parse(call.body ?? "{}") as Record<string, unknown>;
}

export function mockCtx(responses: MockResponse[] = [], options: MockOptions = {}): MockCtx {
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
    const rawHeaders = init?.headers;
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((v, k) => (headers[k.toLowerCase()] = v));
    } else if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) headers[k.toLowerCase()] = String(v);
    } else if (rawHeaders && typeof rawHeaders === "object") {
      for (const [k, v] of Object.entries(rawHeaders)) headers[k.toLowerCase()] = String(v);
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
    const status = next.status ?? 200;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(status === 204 ? null : respBody, {
        status,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const connection = options.display
    ? { display: options.display } as unknown as RedactedConnection
    : undefined;

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    connection,
  };

  return { ctx, calls, logs };
}
