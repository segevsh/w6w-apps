/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: { rows: [] } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), `${BASE_PATH}/rows/`);
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const BASE_UUID = "650d8a0d-7e27-46a8-8b18-6cc6f3db2057";
export const BASE_PATH = `/api-gateway/api/v2/dtables/${BASE_UUID}`;

export interface MockResponse {
  status?: number;
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
  opts: { connected?: boolean } = {},
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
    else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null ? null : String(init.body);
    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    if (queue.length === 0) {
      throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url} — no queued response`);
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
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level: string, message: string, data?: unknown) => logs.push({ level, message, data }),
  } as unknown as HookContext;

  // The redacted Connection an Action sees: display data from `afterConnect`.
  if (opts.connected !== false) {
    (ctx as { connection?: unknown }).connection = {
      id: "conn_1",
      app: "io.w6w.seatable",
      auth: "api-token",
      owner: "u1",
      state: "connected",
      createdAt: "2026-10-06T00:00:00Z",
      display: { baseUuid: BASE_UUID, baseName: "Test base" },
    };
  }
  return { ctx, calls, logs };
}

/** The query string of a recorded call, as a plain object. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The parsed JSON body of a recorded call. */
export function bodyOf(call: CallRecord): Record<string, unknown> {
  return JSON.parse(call.body ?? "null");
}

/** A syntactically real Base-Token: header.payload.signature, payload base64url JSON. */
export function fakeJwt(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ typ: "JWT", alg: "HS256" })}.${b64(claims)}.sig`;
}
