/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
 *   await action.execute({ id: 1 }, ctx);
 *   assertEquals(calls[0].url, `${API}/networks/${NET}/members/1/`);
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test that makes an
 * unexpected extra request fails instead of hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** Re-exported so tests assert against the same constant the client builds from. */
export const API = API_URL;

/** The Network id every connected mock context carries. */
export const NET = "12345";

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

export interface MockCtxOptions {
  /** Public connection metadata visible to actions via `ctx.connection.display`. */
  display?: Record<string, unknown>;
}

export function mockCtx(responses: MockResponse[] = [], options: MockCtxOptions = {}): MockCtx {
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

  const connection: RedactedConnection | undefined = options.display
    ? {
      id: "conn-test",
      app: "io.w6w.mighty-networks",
      auth: "api-token",
      owner: "user-test",
      state: "connected",
      display: options.display,
      createdAt: "2026-10-01T00:00:00Z",
    }
    : undefined;

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    connection,
  };

  return { ctx, calls, logs };
}

/** A `mockCtx` pre-wired with a connected Network id, the common case for actions. */
export function mockConnectedCtx(responses: MockResponse[] = [], networkId = NET): MockCtx {
  return mockCtx(responses, { display: { networkId } });
}

/** Parse a recorded request body back into an object, for assertions. */
export function bodyOf(call: CallRecord): Record<string, unknown> {
  if (!call.body) throw new Error("call carried no body");
  return JSON.parse(call.body) as Record<string, unknown>;
}

/** The query string of a recorded call, as a plain object. */
export function queryOf(call: CallRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(call.url).searchParams) out[k] = v;
  return out;
}
