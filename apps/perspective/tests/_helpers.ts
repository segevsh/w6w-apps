/** Test helper: a mock `HookContext` with a queue of canned responses. */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.perspective.co/v1";

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
  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      headers[k.toLowerCase()] = String(v);
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
  const ctx = { fetch: fetchImpl as unknown as typeof fetch, log: () => {} } as HookContext;
  return { ctx, calls };
}

export const envelope = (data: unknown, meta?: unknown) =>
  meta === undefined ? { data } : { data, meta };

export const errorBody = (error: string, status: number) => ({ error, status });

export const queryOf = (url: string): Record<string, string> =>
  Object.fromEntries(new URL(url).searchParams);

export const pathOf = (url: string): string => new URL(url).pathname;
