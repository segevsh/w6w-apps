/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded. String -> verbatim. */
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
  accountId: string | null = "1234567",
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
    else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null ? null : String(init.body);
    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    const next = queue.shift();
    if (!next) {
      throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url} — no queued response`);
    }
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
    ...(accountId ? { connection: { display: { accountId } } } : {}),
  } as unknown as HookContext;
  return { ctx, calls, logs };
}

export const BASE = "https://1234567.suitetalk.api.netsuite.com";

/** A 204 write answer: no body, the record's URL in `Location`. */
export function created(type: string, id: string): MockResponse {
  return {
    status: 204,
    headers: { location: `${BASE}/services/rest/record/v1/${type}/${id}` },
  };
}

/** NetSuite's documented error envelope. */
export function nsError(status: number, code: string, detail: string): MockResponse {
  return {
    status,
    body: {
      title: "Error",
      status,
      "o:errorDetails": [{ detail, "o:errorCode": code }],
    },
  };
}

/** Call an action's `execute` (typed `unknown`) and read its result as a loose record. */
export async function run(
  action: { execute: (params: never, ctx: never) => unknown },
  params: Record<string, unknown>,
  ctx: HookContext,
  // deno-lint-ignore no-explicit-any
): Promise<Record<string, any>> {
  // deno-lint-ignore no-explicit-any
  return await action.execute(params as never, ctx as never) as Record<string, any>;
}
