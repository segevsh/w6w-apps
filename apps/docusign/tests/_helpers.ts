/**
 * Test helper: build a mock `HookContext` for unit-testing Docusign hooks.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(new URL(calls[0].url).pathname, "/restapi/v2.1/accounts/acc-1/envelopes");
 *
 * The mock queues responses one-per-fetch. Each fetch pops the next response;
 * if the queue is empty the test fails loudly, so a hook that makes an
 * unexpected extra request surfaces the bug rather than hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object → JSON-encoded body. Undefined → no body. String/Uint8Array → verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  /** Request body decoded as text (parsing left to the assertion). */
  body: string | null;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  /** Any log lines emitted by the hook, in order. */
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export interface MockOptions {
  /**
   * Redacted connection display data — never a credential. Defaults to
   * {@link DEFAULT_DISPLAY}; pass `null` to simulate a Connection that never
   * completed `afterConnect`.
   */
  display?: Record<string, unknown> | null;
}

/**
 * What `auth/oauth2.ts`'s `afterConnect` records. Every action composes its URL
 * from these two values, so almost every test needs them present.
 */
export const DEFAULT_DISPLAY: Record<string, unknown> = {
  environment: "production",
  baseUri: "https://na4.docusign.net",
  accountId: "acc-1",
  accountName: "Example Corporation",
};

/** The account-scoped path prefix every action's URL starts with. */
export const ACCOUNT_BASE = "/restapi/v2.1/accounts/acc-1";

/** The parsed JSON body of a recorded call. */
export function bodyOf(call: CallRecord): Record<string, unknown> {
  return JSON.parse(call.body ?? "{}") as Record<string, unknown>;
}

/** The query string of a recorded call, as a `URLSearchParams`. */
export function queryOf(call: CallRecord): URLSearchParams {
  return new URL(call.url).searchParams;
}

/** The path of a recorded call. */
export function pathOf(call: CallRecord): string {
  return new URL(call.url).pathname;
}

/** The hostname of a recorded call — the per-account regional API host. */
export function hostOf(call: CallRecord): string {
  return new URL(call.url).hostname;
}

export function mockCtx(responses: MockResponse[] = [], options: MockOptions = {}): MockCtx {
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
    const body = init?.body == null
      ? null
      : typeof init.body === "string"
      ? init.body
      : String(init.body);

    calls.push({ url, method, headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${method} ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const status = next.status ?? 200;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string" || next.body instanceof Uint8Array
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody as BodyInit | null, {
        status,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const display = options.display === undefined ? DEFAULT_DISPLAY : options.display;
  const connection = display ? { display } as unknown as RedactedConnection : undefined;

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    connection,
  };

  return { ctx, calls, logs };
}
