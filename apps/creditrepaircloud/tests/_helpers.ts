/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: errorResponse(4406, "Wrong API Key or Secret key") }]);
 *   await action.execute({ id: "MQ==" }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/api/lead/viewRecord");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://app.creditrepaircloud.com";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** String -> verbatim body (the API answers XML, so that is the norm here). */
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
    else if (Array.isArray(raw)) { for (const [k, v] of raw) headers[k.toLowerCase()] = String(v); }
    else if (raw && typeof raw === "object") {
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
        headers: next.headers ?? { "content-type": "text/xml" },
      }),
    );
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}

/** A `ctx` whose fetch always rejects, for the "could not reach the host" paths. */
export function unreachableCtx(message = "getaddrinfo ENOTFOUND"): MockCtx {
  const calls: CallRecord[] = [];
  const logs: MockCtx["logs"] = [];
  const ctx: HookContext = {
    fetch: ((input: RequestInfo | URL) => {
      calls.push({
        url: typeof input === "string" ? input : String(input),
        method: "POST",
        headers: {},
        body: null,
      });
      return Promise.reject(new Error(message));
    }) as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };
  return { ctx, calls, logs };
}

/**
 * A successful envelope.
 *
 * The vendor's documentation never shows one, so the inner `<result>` content is
 * test-supplied: this helper makes no claim about the real success shape, it only
 * exercises the parser against a plausible one.
 */
export function okResponse(resultInner = ""): string {
  return `<?xml version="1.0"?>\n<response><success>True</success>` +
    (resultInner ? `<result>${resultInner}</result>` : "") +
    `</response>`;
}

/** The error envelope, exactly as the live probe recorded it. */
export function errorResponse(code: number, message: string): string {
  return `<?xml version="1.0"?>\n<response><success>False</success><result><errors>` +
    `<error_no>${code}</error_no><error_message>${message}</error_message>` +
    `</errors></result></response>`;
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

/** One form field of a recorded `application/x-www-form-urlencoded` body. */
export function formFieldOf(body: string | null, name: string): string | null {
  if (!body) return null;
  return new URLSearchParams(body).get(name);
}

/** The `xmlData` document a recorded call sent, or null. */
export function xmlDataOf(body: string | null): string | null {
  return formFieldOf(body, "xmlData");
}
