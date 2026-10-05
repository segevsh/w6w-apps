/**
 * Test helper: a mock `HookContext` with queued responses and recorded calls.
 * An unqueued fetch throws, so an unexpected extra request fails loudly.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://acme.fellow.app/api/v1";

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

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
}

export function mockCtx(responses: MockResponse[] = [], subdomain = "acme"): MockCtx {
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
    if (raw && typeof raw === "object" && !Array.isArray(raw) && !(raw instanceof Headers)) {
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
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(text, {
        status: next.status ?? 200,
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: () => {},
    connection: { display: { subdomain } },
  } as unknown as HookContext;
  return { ctx, calls };
}

export function pathOf(url: string): string {
  return new URL(url).pathname;
}

export function queryOf(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams);
}

export function bodyOf(call: CallRecord): Record<string, unknown> {
  return JSON.parse(call.body ?? "null");
}

export function page<T>(data: T[], cursor: string | null = null, pageSize = 20) {
  return { page_info: { cursor, page_size: pageSize }, data };
}
