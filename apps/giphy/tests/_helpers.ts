/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.giphy.com/v1/gifs/trending");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.giphy.com/v1";

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

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}

/** GIPHY's success `meta`, in the shape observed on the wire. */
export const META_OK = { status: 200, msg: "OK", response_id: "unit-test-response" };

/** GIPHY's response envelope, with a caller-supplied `data` and extras (`pagination`). */
export function envelope<T>(data: T, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { data, meta: { ...META_OK }, ...extra };
}

/** GIPHY's failure envelope — the vendor's own code and message in `meta`. */
export function giphyError(status: number, msg: string): Record<string, unknown> {
  return { data: [], meta: { status, msg, response_id: "" } };
}

/**
 * A `pagination` fixture.
 *
 * Deliberately opaque: this app passes GIPHY's pagination object through without
 * declaring or reading any field inside it — the documentation page it was
 * verified against did not enumerate them — so the only thing a test can
 * honestly assert is that the object arrives unchanged.
 */
export const PAGINATION_FIXTURE = { next: "opaque-fixture" };

/** A GifObject fixture carrying the fields this app exposes. */
export function gif(id = "abc123"): Record<string, unknown> {
  return {
    id,
    slug: `${id}-fixture`,
    url: `https://giphy.com/gifs/${id}`,
    embed_url: `https://giphy.com/embed/${id}`,
    rating: "g",
    title: "fixture GIF",
    images: {
      original: {
        url: `https://media.giphy.com/media/${id}/giphy.gif`,
        width: "480",
        height: "270",
      },
    },
  };
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
