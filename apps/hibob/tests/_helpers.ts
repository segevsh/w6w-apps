/**
 * Test helper: a mock `HookContext` with a queued fake `ctx.fetch` and a no-op
 * `ctx.log`. Responses are consumed one per fetch; an unqueued fetch throws so a
 * test that makes an unexpected request fails loudly.
 */
import type { HookContext } from "@w6w/types";

export const API = "https://api.hibob.com/v1";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object -> JSON body. String -> verbatim. Undefined -> empty body. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export function mockCtx(responses: MockResponse[] = []): { ctx: HookContext; calls: CallRecord[] } {
  const queue = [...responses];
  const calls: CallRecord[] = [];
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
    const body = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(body, {
        status: next.status ?? 200,
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };
  const ctx = { fetch: fetchImpl, log: () => {} } as unknown as HookContext;
  return { ctx, calls };
}

export function bodyOf(call: CallRecord): unknown {
  return call.body === null ? null : JSON.parse(call.body);
}

export function pathOf(url: string): string {
  const u = new URL(url);
  return u.pathname;
}

export function queryOf(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams.entries());
}
