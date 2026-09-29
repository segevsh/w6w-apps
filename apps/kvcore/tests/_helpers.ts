/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.kvcore.com/v2/public/contact/1");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.kvcore.com/v2/public";

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

/** kvCORE's error envelope: a flat array of messages. */
export function errorsBody(...messages: string[]): Record<string, unknown> {
  return { errors: messages };
}

/** kvCORE's error envelope: a Laravel-style per-field validation map. */
export function validationErrorsBody(fields: Record<string, string[]>): Record<string, unknown> {
  return { errors: fields };
}

/** kvCORE's Laravel-style list pagination envelope. */
export function listEnvelope<T>(
  items: T[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    current_page: 1,
    data: items,
    first_page_url: `${API_ROOT}/x?page=1`,
    from: items.length > 0 ? 1 : null,
    last_page: 1,
    last_page_url: `${API_ROOT}/x?page=1`,
    next_page_url: null,
    path: `${API_ROOT}/x`,
    per_page: 100,
    prev_page_url: null,
    to: items.length > 0 ? items.length : null,
    total: items.length,
    ...extra,
  };
}

/** The query string of a recorded call, as a plain object of repeated-key arrays. */
export function queryOf(url: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of new URL(url).searchParams) {
    (out[k] ??= []).push(v);
  }
  return out;
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}
