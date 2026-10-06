/**
 * Test helper: build a mock `HookContext`.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: {...} }]);
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly.
 */
import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object -> JSON. String -> verbatim. Undefined -> empty body. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export function mockCtx(responses: MockResponse[] = []) {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const logs: Array<{ level: string; message: string; data?: unknown }> = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw && typeof raw === "object" && !Array.isArray(raw) && !(raw instanceof Headers)) {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null ? null : String(init.body);
    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    const next = queue.shift();
    if (!next) throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url}`);
    const status = next.status ?? 200;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(status === 204 ? null : respBody, {
        status,
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

/** The query string of a recorded URL, as a plain object (last value wins). */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** All values of one query key, in order. */
export function queryAll(url: string, key: string): string[] {
  return new URL(url).searchParams.getAll(key);
}

export function pathOf(url: string): string {
  return new URL(url).pathname;
}

export function jsonBody(call: CallRecord): Record<string, unknown> {
  return JSON.parse(call.body ?? "null");
}
