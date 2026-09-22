/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.sendfox.com/contacts");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.sendfox.com";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. 204). String -> verbatim. */
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
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export function mockCtx(responses: MockResponse[] = []): MockCtx {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const logs: MockCtx["logs"] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
    else if (Array.isArray(raw)) { for (const [k, v] of raw) headers[k.toLowerCase()] = String(v); }
    else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null
      ? null
      : typeof init.body === "string"
      ? init.body
      : String(init.body);

    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${
          calls[calls.length - 1].method
        } ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status: next.status ?? 200,
        statusText: next.statusText ?? "",
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

/** SendFox's Laravel paginator, the shape of every collection response. */
export function page<T>(data: T[], extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { data, current_page: 1, total: data.length, per_page: 100, ...extra };
}

/** The shape `GET /contacts?count_only=true` answers. */
export function count(count: number, filter = 'status = "active"'): Record<string, unknown> {
  return { count, filter };
}

/** SendFox's Laravel error body. `errors` only appears on a 422. */
export function errorBody(
  message: string,
  errors?: Record<string, string[]>,
): Record<string, unknown> {
  return errors ? { message, errors } : { message };
}

/** The structured 403 body an account restricted by SendFox receives. */
export function accountRestrictedBody(): Record<string, unknown> {
  return {
    error: "API access is unavailable while the account is restricted.",
    code: "account_restricted",
    account_status_url: "https://sendfox.com/account/status",
  };
}

/** A `User`, as `GET /me` answers it. */
export function user(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: "Acme",
    email: "owner@acme.example",
    contacts_count: 42,
    contact_limit: 5000,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

/** The query string of a recorded call, as a plain object (last value wins). */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** Every value of one query key, for repeated-key assertions. */
export function queryAllOf(url: string, key: string): string[] {
  return new URL(url).searchParams.getAll(key);
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}
