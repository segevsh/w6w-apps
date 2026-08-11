/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.fillout.com/v1/api/forms");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export const US_ROOT = "https://api.fillout.com/v1/api";
export const EU_ROOT = "https://eu-api.fillout.com/v1/api";

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

export interface MockOptions {
  /** `"us"` (default) or `"eu"`; anything else is passed through verbatim. */
  region?: string;
  /** Omit the Connection entirely, as the host does for an unsigned check. */
  noConnection?: boolean;
  invocationId?: string;
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

  const connection = options.noConnection ? undefined : ({
    id: "conn-1",
    app: "io.w6w.fillout",
    auth: "api-key",
    owner: "user-1",
    state: "connected",
    createdAt: "2026-08-11T00:00:00.000Z",
    display: { region: options.region ?? "us" },
  } as RedactedConnection);

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    ...(connection ? { connection } : {}),
    ...(options.invocationId
      ? { invocation: { invocationId: options.invocationId, trigger: "run" } }
      : {}),
  } as HookContext;

  return { ctx, calls, logs };
}

/** Fillout's error envelope, in the exact shape observed on the wire. */
export function errorBody(status: number, error: string, message: unknown): string {
  return JSON.stringify({ statusCode: status, error, message });
}

/** A `400` carrying a stringified Zod issue array, as `POST .../submissions` returns. */
export function zodErrorBody(issues: unknown[]): string {
  return errorBody(400, "Bad Request", JSON.stringify(issues, null, 2));
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

/** The host of a recorded call. */
export function hostOf(url: string): string {
  return new URL(url).hostname;
}
