/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: { data: { account: { id: "1" } } } }]);
 *   await action.execute({}, ctx);
 *   assertEquals(gqlOf(calls[0]).variables, { input: { … } });
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 *
 * Buffer-specific: every call in this app is a `POST` to one URL with a
 * `{ query, variables }` JSON body, so the assertion helpers are about the
 * *body* rather than the path — `gqlOf` splits it, and `gql` / `data` build
 * the two response envelopes.
 */
import type { HookContext } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** Re-exported so tests assert against the same constant the client builds from. */
export const API = API_URL;

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body. String -> verbatim. */
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
    else if (Array.isArray(raw)) {
      for (const [k, v] of raw) headers[k.toLowerCase()] = String(v);
    } else if (raw && typeof raw === "object") {
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

/** Split a recorded GraphQL request into its query text and variables. */
export function gqlOf(call: CallRecord): {
  query: string;
  variables: Record<string, unknown>;
} {
  if (!call.body) throw new Error("call carried no body");
  const parsed = JSON.parse(call.body) as {
    query?: string;
    variables?: Record<string, unknown>;
  };
  return { query: parsed.query ?? "", variables: parsed.variables ?? {} };
}

/** A successful `{ data: … }` envelope. */
export function data(payload: unknown): MockResponse {
  return { body: { data: payload } };
}

/** A `{ errors: [...] }` envelope. `status` defaults to 200 — Buffer's own case. */
export function gqlError(
  message: string,
  code?: string,
  status = 200,
  extra: Record<string, unknown> = {},
): MockResponse {
  return {
    status,
    body: {
      data: null,
      errors: [{ message, extensions: { ...(code ? { code } : {}), ...extra } }],
    },
  };
}

/**
 * Narrow a param lookup, throwing a named error instead of casting.
 * Keeps the tests readable when a param key is renamed.
 */
export function param<T extends { params?: Array<{ key: string }> }>(
  action: T,
  key: string,
): { key: string; [k: string]: unknown } {
  const found = (action.params ?? []).find((p) => p.key === key);
  if (!found) throw new Error(`no param "${key}"`);
  return found as { key: string; [k: string]: unknown };
}

/** The `value`s of a select/multiselect param's static options. */
export function optionValues(
  action: { params?: Array<{ key: string; options?: unknown }> },
  key: string,
): Array<string | number> {
  const p = param(action, key);
  const options = p.options;
  if (!Array.isArray(options)) throw new Error(`param "${key}" has no static options`);
  return options.map((o) => (o as { value: string | number }).value);
}
