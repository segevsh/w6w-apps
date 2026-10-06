import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object -> JSON; string -> verbatim; undefined -> empty body. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

/** Mock HookContext: queued responses, recorded calls, no-op log. An unqueued fetch throws. */
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
    const raw = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(raw, {
        status: next.status ?? 200,
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };
  const ctx = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: () => {},
  } as unknown as HookContext;
  return { ctx, calls };
}

export function pathOf(url: string): string {
  return new URL(url).pathname;
}

export function queryOf(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams);
}

export const page = <T>(entries: T[], after: string | null = null) => ({
  entries,
  metadata: { after, before: null, limit: 20 },
});
