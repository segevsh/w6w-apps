/**
 * Test helper: build a mock `HookContext` for unit-testing actions.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([
 *     { status: 200, body: { data: [], has_more: false } },
 *   ]);
 *   const result = await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people/search");
 */
import type { ActionDefinition, HookContext, OutputField, Param } from "@w6w/types";

/**
 * Run an action's `execute` and narrow its result.
 *
 * `ActionDefinition.execute` is declared as returning `unknown` — the runtime
 * cannot know an action's payload shape — so a test that reads a property off
 * the result needs a narrowing step. Doing it here, once, keeps the casts out of
 * the assertions themselves and makes the expected shape explicit at the call
 * site rather than implicit in a bare `as`.
 */
export async function run<T = Record<string, unknown>>(
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>,
  // deno-lint-ignore no-explicit-any
  input: any,
  ctx: HookContext,
): Promise<T> {
  return await action.execute(input, ctx) as T;
}

/**
 * An action's declared output keys.
 *
 * `ActionDefinition.output` is `OutputField[] | DynamicOutput` — a union,
 * because an action may instead name a hook that describes its shape at runtime.
 * Every output in this app is static, so this narrows to the array form and
 * fails clearly if that ever stops being true.
 */
// deno-lint-ignore no-explicit-any
export function outputKeys(action: ActionDefinition<any>): string[] {
  const output = action.output;
  if (!Array.isArray(output)) {
    throw new Error(`${action.key}: output is dynamic, not a static list`);
  }
  return (output as OutputField[]).map((o) => o.key);
}

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

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}
