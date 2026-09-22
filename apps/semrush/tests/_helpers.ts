/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: envelope({ backlinks_count: 12 }) }]);
 *   await action.execute({ url: "example.com", scope: "ROOT_DOMAIN" }, ctx);
 *   assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN" });
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.semrush.com/apis/v4";
export const LEGACY_ROOT = "https://www.semrush.com";

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
        headers: next.headers ??
          { "content-type": typeof next.body === "string" ? "text/plain" : "application/json" },
      }),
    );
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}

/** SEMrush's success envelope: `{"meta": {…, "success": true}, "data": …}`. */
export function envelope<T>(data: T): Record<string, unknown> {
  return {
    meta: {
      success: true,
      status_code: 200,
      request_id: "req-0123456789abcdef",
      url: "example.com",
      scope: "ROOT_DOMAIN",
    },
    data,
  };
}

/** SEMrush's error envelope, in the exact shape observed on the wire. */
export function errorEnvelope(
  code: number,
  message = "Unauthorized",
  retryable = false,
): Record<string, unknown> {
  return {
    meta: { success: false, status_code: code, request_id: "req-0123456789abcdef" },
    error: { code, message, retryable, details: {} },
  };
}

/** The legacy balance endpoint's error shape — the one that echoes the key. */
export function balanceError(key: string): Record<string, unknown> {
  return { errors: [{ field: "key", message: `invalid api key: ${key}` }] };
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

/** The host of a recorded call. */
export function hostOf(url: string): string {
  return new URL(url).hostname;
}
