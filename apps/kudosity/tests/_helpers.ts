/**
 * Mock `HookContext` for unit tests. Responses are queued one per fetch; an unqueued fetch throws
 * so an unexpected extra request fails loudly.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.transmitmessage.com/v2";

export interface MockResponse {
  status?: number;
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
    if (!next) throw new Error(`mockCtx: unexpected fetch to ${url}`);
    const body = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(body, {
        status: next.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
    );
  };
  const ctx = { fetch: fetchImpl as unknown as typeof fetch, log: () => {} } as HookContext;
  return { ctx, calls };
}

export function pathOf(url: string): string {
  return new URL(url).pathname;
}

export function queryOf(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

export function bodyOf(call: CallRecord): Record<string, unknown> {
  return JSON.parse(call.body ?? "null");
}

/** `{data, meta}` envelope used by the WhatsApp / RCS / senders family. */
export function envelope(data: unknown, meta: unknown = {}) {
  return { data, request: {}, meta };
}

/** RFC 9457 style error used by the same family. */
export function problem(status: number, title: string, detail: string, issues?: unknown[]) {
  return {
    error: {
      type: "https://developers.kudosity.com/reference/errors",
      title,
      detail,
      status,
      issues,
    },
  };
}
