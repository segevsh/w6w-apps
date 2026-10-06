import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  body?: unknown;
  contentType?: string;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

/** Mock HookContext: responses are queued one per fetch; an unqueued fetch throws. */
export function mockCtx(responses: MockResponse[] = []) {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      headers[k.toLowerCase()] = String(v);
    }
    calls.push({
      url: String(input),
      method: (init?.method ?? "GET").toUpperCase(),
      headers,
      body: init?.body == null ? null : String(init.body),
    });
    const next = queue.shift();
    if (!next) throw new Error(`unexpected fetch #${calls.length} to ${String(input)}`);
    const text = next.body === undefined
      ? ""
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(text, {
        status: next.status ?? 200,
        headers: { "content-type": next.contentType ?? "application/json" },
      }),
    );
  };
  const ctx = { fetch: fetchImpl as typeof fetch, log: () => {} } as unknown as HookContext;
  return { ctx, calls };
}

export const OK = { request_id: "req1", result: "OK" };

export function pathOf(url: string): string {
  return new URL(url).pathname;
}

export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}
