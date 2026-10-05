import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
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

/** A fake `ctx.fetch` that records each call and replays queued responses. */
export function mockCtx(responses: MockResponse[] = []): MockCtx {
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
    const body = init?.body == null ? null : String(init.body);
    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    const next = queue.shift();
    if (!next) throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url}`);
    const status = next.status ?? 200;
    const noBody = status === 204 || next.body === undefined;
    return Promise.resolve(
      new Response(
        noBody ? null : typeof next.body === "string" ? next.body : JSON.stringify(next.body),
        { status, headers: next.headers ?? { "content-type": "application/json" } },
      ),
    );
  };

  const ctx = { fetch: fetchImpl, log: () => {} } as unknown as HookContext;
  return { ctx, calls };
}

/** HoneyBook's error envelope, in the shape the OpenAPI `info` section documents. */
export function errorBody(
  errorType: string,
  message: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    error: true,
    is_timeout: false,
    error_type: errorType,
    error_message: message,
    error_data: {},
    ...extra,
  };
}

export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

export function pathOf(url: string): string {
  return new URL(url).pathname;
}
