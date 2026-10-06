/**
 * Test helper: a mock `HookContext` whose `fetch` replays queued responses one per call. An
 * unqueued fetch throws, so a test that makes an unexpected extra request fails loudly.
 */
import type { HookContext } from "@w6w/types";
import { assertRejects as stdAssertRejects } from "@std/assert";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object -> JSON; string -> verbatim; undefined -> empty body. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export function mockCtx(responses: MockResponse[] = []) {
  const queue = [...responses];
  const calls: CallRecord[] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw && typeof raw === "object" && !(raw instanceof Headers) && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    calls.push({
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers,
      body: init?.body == null ? null : String(init.body),
    });
    const next = queue.shift();
    if (!next) throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url}`);
    const body = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(body, {
        status: next.status ?? 200,
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx = { fetch: fetchImpl as unknown as typeof fetch, log: () => {} } as HookContext;
  return { ctx, calls };
}

export function pathOf(url: string): string {
  return new URL(url).pathname;
}

export function queryOf(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams);
}

export function bodyOf(call: CallRecord): Record<string, unknown> {
  return JSON.parse(call.body ?? "null");
}

/** Alegra's application-layer error envelope. */
export function alegraError(code: number, error: string): Record<string, unknown> {
  return { error, code };
}

/** The AWS API gateway's refusal: bare `message`, no `code`. */
export const GATEWAY_401 = { message: "Unauthorized" };

/** `assertRejects` for hooks whose return type is `unknown | Promise<unknown>`. */
export async function assertRejects(
  fn: () => unknown,
  // deno-lint-ignore no-explicit-any
  ErrorClass: new (...args: any[]) => Error,
  msgIncludes: string,
): Promise<void> {
  await stdAssertRejects(
    async () => {
      await fn();
    },
    ErrorClass,
    msgIncludes,
  );
}
