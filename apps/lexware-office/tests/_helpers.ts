import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  /** Raw bytes, for the file download. */
  bytes?: Uint8Array;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

/** Queue of responses, one per fetch; an unqueued fetch throws. */
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
    const payload = next.bytes
      ? next.bytes as unknown as BodyInit
      : next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(payload, {
        status: next.status ?? 200,
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };
  const ctx = { fetch: fetchImpl as unknown as typeof fetch, log: () => {} } as HookContext;
  return { ctx, calls };
}

export const gateway = (message: string): Record<string, unknown> => ({ message });

export const queryOf = (url: string): Record<string, string> =>
  Object.fromEntries(new URL(url).searchParams);
export const pathOf = (url: string): string => new URL(url).pathname;

export const PAGE = {
  content: [{ id: "a" }],
  first: true,
  last: true,
  totalPages: 1,
  totalElements: 1,
  numberOfElements: 1,
  size: 25,
  number: 0,
};
