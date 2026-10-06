/**
 * Test helper: build a mock `HookContext`. Responses are queued one-per-fetch; an unqueued
 * fetch throws, so an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object/array/number -> JSON-encoded. String -> verbatim (set `raw`). */
  body?: unknown;
  /** Send `body` verbatim as text instead of JSON-encoding it. */
  raw?: boolean;
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
    if (raw && typeof raw === "object" && !(raw instanceof Headers) && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    calls.push({
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers,
      body: init?.body == null ? null : String(init.body),
    });
    const next = queue.shift();
    if (!next) throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url}`);
    const text = next.body === undefined
      ? null
      : next.raw
      ? String(next.body)
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(text, {
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

/** PrintNode's error body, as observed on the wire. */
export function errorBody(code: string, message: string, uid = "uid-1") {
  return { code, message, uid };
}

export const pathOf = (url: string) => new URL(url).pathname;

export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}
