/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.thinkific.com/api/public/v1/courses");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.thinkific.com/api/public/v1";

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

/** A ctx that also carries invocation metadata, for actions that read it. */
export function mockCtxWithInvocation(
  responses: MockResponse[] = [],
  invocationId = "inv-0123456789abcdef",
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { invocation?: unknown }).invocation = { invocationId, trigger: "run" };
  return mock;
}

/** Thinkific's paginated list envelope: `{items, meta: {pagination}}`. */
export function listEnvelope<T>(
  items: T[],
  pagination: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    items,
    meta: {
      pagination: {
        current_page: 1,
        next_page: null,
        prev_page: null,
        total_pages: 1,
        total_items: items.length,
        entries_info: `1-${items.length} of ${items.length}`,
        ...pagination,
      },
    },
  };
}

/** Thinkific's bare-string error envelope: `{"error": "..."}`. */
export function errorBody(error: string): Record<string, unknown> {
  return { error };
}

/** Thinkific's field-keyed validation error envelope. */
export function validationErrorBody(errors: Record<string, string[]>): Record<string, unknown> {
  return { errors };
}

/** The query string of a recorded call, as a plain object. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/**
 * Assert a promise rejects, optionally checking the message contains `needle`.
 *
 * `fn` is typed to return `unknown` rather than `Promise<unknown>` because an
 * `ActionExecuteHook`'s declared return type (`O | Promise<O>`) collapses to
 * plain `unknown` when `O` is `unknown` — the default when an action's
 * `ActionDefinition<Input>` leaves its output type unspecified.
 */
export async function assertRejectsWith(fn: () => unknown, needle?: string) {
  try {
    await Promise.resolve(fn());
  } catch (e) {
    if (needle) {
      const msg = (e as Error).message;
      if (!msg.includes(needle)) {
        throw new Error(`expected error message to include "${needle}", got: ${msg}`);
      }
    }
    return;
  }
  throw new Error("expected a rejection");
}
