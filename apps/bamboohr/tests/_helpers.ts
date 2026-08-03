/**
 * Test helper: build a mock `HookContext` for unit-testing actions.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([
 *     { status: 200, body: { data: [], has_more: false } },
 *   ]);
 *   const result = await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.close.com/api/v1/lead/");
 */
import type { ActionDefinition, HookContext, Param } from "@w6w/types";

/**
 * Look a param up by key, failing loudly if it is missing.
 *
 * Tests assert on params constantly, and `find` returning `undefined` produces a
 * confusing downstream error rather than naming the param that vanished.
 */
// deno-lint-ignore no-explicit-any
export function param(action: ActionDefinition<any>, key: string): Param {
  const found = (action.params ?? []).find((p) => p.key === key);
  if (!found) throw new Error(`${action.key}: no param "${key}"`);
  return found;
}

/**
 * The static option VALUES of a param.
 *
 * `Param.options` is `Option[] | DynamicOptions` — a union, because options may
 * instead name a hook that populates them at runtime. Every option list in this
 * app is static, so this narrows to the array form and fails clearly if that
 * ever stops being true, rather than letting a test cast the difference away.
 */
// deno-lint-ignore no-explicit-any
export function optionValues(action: ActionDefinition<any>, key: string): Array<string | number> {
  const options = param(action, key).options;
  if (!Array.isArray(options)) {
    throw new Error(`${action.key}/${key}: options are dynamic, not a static list`);
  }
  return options.map((o) => o.value);
}

/** An action's description, asserted to exist — it is required by our own conventions. */
// deno-lint-ignore no-explicit-any
export function description(action: ActionDefinition<any>): string {
  if (!action.description) throw new Error(`${action.key}: no description`);
  return action.description;
}

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object → JSON-encoded body. Undefined → no body. String → verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  /** Request body decoded as text. */
  body: string | null;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

/**
 * The company subdomain every test connects as, unless it overrides it.
 *
 * BambooHR's API host is per-customer, so `BambooClient` cannot build a URL at
 * all without a Connection carrying one. Tests therefore get a Connection by
 * default — an action test should not have to set one up to assert on a path.
 */
export const TEST_SUBDOMAIN = "acme";

export interface MockCtxOptions {
  /**
   * What `connection.display` should contain. Defaults to
   * `{ subdomain: TEST_SUBDOMAIN }`. Pass `null` to omit the Connection
   * entirely, which is how the "unconnected" failure path is exercised.
   */
  display?: Record<string, unknown> | null;
}

export function mockCtx(
  responses: MockResponse[] = [],
  options: MockCtxOptions = {},
): MockCtx {
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

  const display = options.display === undefined ? { subdomain: TEST_SUBDOMAIN } : options.display;

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    ...(display === null ? {} : {
      connection: {
        id: "conn_test",
        app: "io.w6w.bamboohr",
        auth: "api-key",
        owner: "user_test",
        state: "connected",
        createdAt: "2026-08-03T00:00:00.000Z",
        display,
      },
    }),
  };

  return { ctx, calls, logs };
}
