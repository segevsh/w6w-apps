/**
 * Test helpers: a mock `HookContext` for unit-testing Odoo actions.
 *
 * Unlike most apps in this pack, an Odoo action cannot build a URL without the
 * Connection — the instance host is per-tenant and lives in the redacted
 * `connection.display`. So `mockCtx` seeds a default display and every action
 * test exercises the real `OdooClient.fromConnection` path.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ result: [{ id: 1 }] }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(rpcParams(calls[0]).args, ["res.partner", "search_read", [], { domain: [] }]);
 */
import type { ActionDefinition, HookContext, Param } from "@w6w/types";

export const TEST_INSTANCE = "https://acme.odoo.com";
export const TEST_DATABASE = "acme";
export const TEST_LOGIN = "bot@acme.com";
export const TEST_API_KEY = "0123456789abcdef";
export const TEST_UID = 7;

/** Look a param up by key, failing loudly if it is missing. */
// deno-lint-ignore no-explicit-any
export function param(action: ActionDefinition<any>, key: string): Param {
  const found = (action.params ?? []).find((p) => p.key === key);
  if (!found) throw new Error(`${action.key}: no param "${key}"`);
  return found;
}

/** An action's description, asserted to exist — required by our own conventions. */
// deno-lint-ignore no-explicit-any
export function description(action: ActionDefinition<any>): string {
  if (!action.description) throw new Error(`${action.key}: no description`);
  return action.description;
}

/**
 * A queued fake response.
 *
 * `result` and `error` build a JSON-RPC envelope, which is what Odoo actually
 * returns; `body` is the escape hatch for malformed/non-JSON responses.
 */
export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  result?: unknown;
  error?: { code?: number; message?: string; data?: Record<string, unknown> };
  /** Verbatim body — overrides `result`/`error`. */
  body?: string;
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

export interface MockOptions {
  /** Override the redacted connection display; `null` omits the connection entirely. */
  display?: Record<string, unknown> | null;
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
    const raw = init?.headers;
    if (raw instanceof Headers) {
      raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
    } else if (Array.isArray(raw)) {
      for (const [k, v] of raw) headers[k.toLowerCase()] = String(v);
    } else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null ? null : String(init.body);

    calls.push({ url, method, headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${method} ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const text = next.body !== undefined ? next.body : JSON.stringify(
      next.error
        ? { jsonrpc: "2.0", id: 1, error: next.error }
        : { jsonrpc: "2.0", id: 1, result: next.result ?? null },
    );
    return Promise.resolve(
      new Response(text, {
        // Odoo answers 200 even for errors — the default reflects that.
        status: next.status ?? 200,
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const display = options.display === undefined
    ? {
      instanceUrl: TEST_INSTANCE,
      database: TEST_DATABASE,
      username: TEST_LOGIN,
      uid: TEST_UID,
    }
    : options.display;

  const ctx = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level: string, message: string, data?: unknown) => logs.push({ level, message, data }),
    ...(display === null ? {} : { connection: { display } }),
  } as unknown as HookContext;

  return { ctx, calls, logs };
}

/** The JSON-RPC `params` object of a recorded call. */
export function rpcParams(call: CallRecord): {
  service: string;
  method: string;
  args: unknown[];
} {
  if (!call.body) throw new Error("recorded call had no body");
  return JSON.parse(call.body).params;
}

/** The `[model, method, args, kwargs]` tail of an unsigned execute_kw envelope. */
export function executeKwArgs(call: CallRecord): {
  model: string;
  method: string;
  args: unknown[];
  kwargs: Record<string, unknown>;
} {
  const params = rpcParams(call);
  const [model, method, args, kwargs] = params.args as [
    string,
    string,
    unknown[],
    Record<string, unknown>,
  ];
  return { model, method, args, kwargs };
}

/** A well-formed stored credential, for auth tests. */
export function credential(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    instanceUrl: TEST_INSTANCE,
    database: TEST_DATABASE,
    username: TEST_LOGIN,
    apiKey: TEST_API_KEY,
    uid: TEST_UID,
    ...overrides,
  };
}
