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

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };
  return { ctx, calls, logs };
}

/** Digistore24's success envelope, in the shape measured on the wire. */
export function envelope(data: unknown): Record<string, unknown> {
  return { api_version: "1.2", current_time: "2026-10-05 20:34:19", result: "success", data };
}

/** Digistore24's error envelope — served with HTTP 200. */
export function errorEnvelope(message: string, code: number): Record<string, unknown> {
  return {
    api_version: "1.2",
    current_time: "2026-10-05 20:34:19",
    result: "error",
    message,
    code,
  };
}

/** The API function a recorded call addressed (last path segment). */
export function fnOf(url: string): string {
  const u = new URL(url);
  const prefix = "/api/call/";
  if (u.origin !== "https://www.digistore24.com" || !u.pathname.startsWith(prefix)) {
    throw new Error(`unexpected URL ${url}`);
  }
  return u.pathname.slice(prefix.length);
}

/** The arguments of a recorded call: the query string for a GET, the form body for a POST. */
export function fieldsOf(call: CallRecord): Record<string, string> {
  const params = call.method === "GET"
    ? new URL(call.url).searchParams
    : new URLSearchParams(call.body ?? "");
  const out: Record<string, string> = {};
  for (const [k, v] of params) out[k] = v;
  return out;
}
