/**
 * Test helper: build a mock `HookContext` for unit-testing actions.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([
 *     { status: 200, body: [] },
 *   ]);
 *   const result = await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.lemlist.com/api/x");
 */
import type { ActionDefinition, HookContext, OutputField, Param } from "@w6w/types";

/**
 * An action of any input shape.
 *
 * The helpers below inspect an action's declared metadata — params, options,
 * output — none of which depends on its input type, so they are generic over
 * every action in the app. One alias carries the single `any` rather than
 * repeating a lint suppression on each helper.
 */
// deno-lint-ignore no-explicit-any
type AnyAction = ActionDefinition<any>;

/** Every param of an action, narrowed from the optional field. */
export function params(action: AnyAction): Param[] {
  return action.params ?? [];
}

/**
 * Look a param up by key, failing loudly if it is missing.
 *
 * Tests assert on params constantly, and `find` returning `undefined` produces a
 * confusing downstream error rather than naming the param that vanished.
 */
export function param(action: AnyAction, key: string): Param {
  const found = params(action).find((p) => p.key === key);
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
export function optionValues(action: AnyAction, key: string): Array<string | number | boolean> {
  const options = param(action, key).options;
  if (!Array.isArray(options)) {
    throw new Error(`${action.key}/${key}: options are dynamic, not a static list`);
  }
  return options.map((o) => o.value);
}

/**
 * An action's static output fields. `Output` is `OutputField[] | DynamicOutput`
 * for the same reason `Options` is a union; every action here is static.
 */
export function outputFields(action: AnyAction): OutputField[] {
  const output = action.output;
  if (!Array.isArray(output)) {
    throw new Error(`${action.key}: output is dynamic, not a static list`);
  }
  return output;
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
