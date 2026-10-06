/**
 * Test helper: a mock `HookContext` whose `ctx.fetch` replays queued responses
 * in order and records every call. An unqueued fetch throws, so a test that
 * makes an unexpected extra request fails instead of passing silently.
 *
 *   const { ctx, calls } = mockCtx([{ body: { data: { uid: "x" } } }]);
 */
import type { HookContext } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/** `https://api.podium.com/v4` — what every action's URL must start with. */
export const API = `${API_BASE}${API_PREFIX}`;

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded. String -> verbatim. Undefined -> empty body. */
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
  const logs: Array<{ level: string; message: string }> = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      headers[k.toLowerCase()] = String(v);
    }
    calls.push({
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers,
      body: init?.body == null ? null : String(init.body),
    });
    const next = queue.shift();
    if (!next) throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url}`);
    const payload = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(payload, {
        status: next.status ?? 200,
        headers: { "content-type": "application/json", ...(next.headers ?? {}) },
      }),
    );
  };

  const ctx = {
    fetch: fetchImpl,
    log: (level: string, message: string) => logs.push({ level, message }),
  } as unknown as HookContext;

  return { ctx, calls, logs };
}
