/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 202, body: jobBody() }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api-v2.mindee.net/v2/products/extraction/enqueue");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_BASE = "https://api-v2.mindee.net";

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
  /** Parsed multipart fields, when the request body was a `FormData`. */
  form?: Record<string, string[]>;
  /** Raw text body, for a JSON request. */
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

  const fetchImpl = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
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

    let form: Record<string, string[]> | undefined;
    let body: string | null = null;
    if (init?.body instanceof FormData) {
      form = {};
      for (const [k, v] of init.body.entries()) {
        const value = typeof v === "string" ? v : `<blob:${v.type}:${v.size}b:${await v.text()}>`;
        (form[k] ??= []).push(value);
      }
    } else if (init?.body != null) {
      body = typeof init.body === "string" ? init.body : String(init.body);
    }

    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, form, body });

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
    return new Response(respBody, {
      status: next.status ?? 200,
      statusText: next.statusText ?? "",
      headers: next.headers ?? { "content-type": "application/json" },
    });
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}

/** Mindee's `JobResponse` envelope. */
export function jobResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    job: {
      id: "018f1e2a-0000-7000-8000-000000000001",
      model_id: "018f1e2a-0000-7000-8000-0000000000aa",
      filename: "invoice.pdf",
      alias: null,
      created_at: "2026-09-15T10:00:00.000Z",
      completed_at: null,
      status: "Processing",
      polling_url: "https://api-v2.mindee.net/v2/jobs/018f1e2a-0000-7000-8000-000000000001",
      result_url: null,
      webhooks: [],
      error: null,
      ...overrides,
    },
  };
}

/** Mindee's RFC 9457 error envelope, in the exact shape observed on the wire. */
export function errorBody(
  status: number,
  code: string,
  title: string,
  detail: string,
  errors: Array<{ pointer: string | null; detail: string }> = [],
): Record<string, unknown> {
  return { status, title, detail, code, errors };
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
