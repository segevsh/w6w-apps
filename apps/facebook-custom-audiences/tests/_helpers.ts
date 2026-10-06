/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(new URL(calls[0].url).pathname, "/v25.0/act_1/customaudiences");
 *
 * Responses are queued one per fetch; an unexpected extra request throws so the
 * test fails loudly rather than hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object → JSON-encoded body. Undefined → no body (e.g. 204). String → verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface MockCtxOptions {
  invocationId?: string;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export function mockCtx(responses: MockResponse[] = [], opts: MockCtxOptions = {}): MockCtx {
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
      new Response(respBody, {
        status,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const connection = {
    id: "conn-1",
    app: "io.w6w.facebook-custom-audiences",
    auth: "oauth2",
    owner: "user-1",
    state: "connected",
    createdAt: "2026-08-03T00:00:00.000Z",
    display: {},
  } as RedactedConnection;

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    connection,
    invocation: { invocationId: opts.invocationId ?? "inv-abc" } as HookContext["invocation"],
  };

  return { ctx, calls, logs };
}

/** Parse the JSON body a client sent, for assertions. */
export function jsonBody(call: CallRecord): Record<string, unknown> {
  if (!call.body) throw new Error("call carried no body");
  return JSON.parse(call.body) as Record<string, unknown>;
}
