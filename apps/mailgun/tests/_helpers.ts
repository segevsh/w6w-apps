/**
 * Test helper: build a mock `HookContext` for unit-testing actions.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([
 *     { status: 200, body: { items: [] } },
 *   ]);
 *   const result = await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.mailgun.net/v4/domains");
 *
 * The mock queues responses one-per-fetch. Each fetch pops the next response;
 * if the queue is empty the test fails loudly (so a test that makes an
 * unexpected extra request surfaces the bug rather than hanging).
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object → JSON-encoded body. Undefined → no body (e.g. 204). String → verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  /** Request body decoded as text (JSON/form parsing left to the assertion). */
  body: string | null;
  /** Present when the request body was a `FormData` (e.g. message-send). */
  formData?: FormData;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  /** Any log lines emitted by the action, in order. */
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export interface MockCtxOptions {
  /** Redacted connection — e.g. `{ display: { region: "eu" } }`. */
  connection?: Partial<RedactedConnection>;
}

export function mockCtx(responses: MockResponse[] = [], options: MockCtxOptions = {}): MockCtx {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const logs: MockCtx["logs"] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    const rawHeaders = init?.headers;
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((v, k) => (headers[k.toLowerCase()] = v));
    } else if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) headers[k.toLowerCase()] = String(v);
    } else if (rawHeaders && typeof rawHeaders === "object") {
      for (const [k, v] of Object.entries(rawHeaders)) headers[k.toLowerCase()] = String(v);
    }

    let body: string | null = null;
    let formData: FormData | undefined;
    if (init?.body instanceof FormData) {
      formData = init.body;
    } else if (init?.body != null) {
      body = typeof init.body === "string" ? init.body : String(init.body);
    }

    calls.push({ url, method, headers, body, formData });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${method} ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const status = next.status ?? 200;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    connection: options.connection as RedactedConnection | undefined,
  };

  return { ctx, calls, logs };
}
