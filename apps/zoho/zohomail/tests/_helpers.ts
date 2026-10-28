/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: envelope([]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://mail.zoho.com/api/accounts");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export const API_ROOT = "https://mail.zoho.com/api";

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

export function mockCtx(
  responses: MockResponse[] = [],
  connection?: Partial<RedactedConnection>,
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

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    ...(connection ? { connection: connection as RedactedConnection } : {}),
  };

  return { ctx, calls, logs };
}

/** A connection whose `display` carries the US `apiHost` and a default `accountId`. */
export function usConnection(display: Record<string, unknown> = {}): Partial<RedactedConnection> {
  return {
    id: "conn_1",
    app: "io.w6w.zohomail",
    auth: "oauth2-us",
    owner: "user_1",
    state: "connected",
    createdAt: new Date().toISOString(),
    display: { apiHost: "mail.zoho.com", accountId: "2560636000000008002", ...display },
  };
}

/** Zoho Mail's success envelope: `{"status": {...}, "data": ...}`. */
export function envelope<T>(data: T, code = 200, description = "success"): Record<string, unknown> {
  return { status: { code, description }, data };
}

/** The `updatemessage`/`updatethread` success shape — `status` only, no `data` at all. */
export function statusOnly(code = 200, description = "success"): Record<string, unknown> {
  return { status: { code, description } };
}

/** Zoho Mail's error envelope, in the exact shape observed on the wire. */
export function errorBody(errorCode: string, moreInfo?: string): Record<string, unknown> {
  return { data: { errorCode, ...(moreInfo ? { moreInfo } : {}) }, status: { code: 400 } };
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
