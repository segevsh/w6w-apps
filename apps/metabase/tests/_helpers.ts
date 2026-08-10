/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockMetabaseCtx([{ status: 202, body: { status: "completed" } }]);
 *   await action.execute({ cardId: 1 }, ctx);
 *   assertEquals(calls[0].url, "https://metabase.example.com/api/card/1/query");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. 204). String -> verbatim. */
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

/** The instance every action test addresses. */
export const SITE_URL = "https://metabase.example.com";

/**
 * Metabase's client resolves the instance origin from the Connection, so an
 * action test needs a ctx carrying one. This wraps `mockCtx` with a redacted
 * connection whose `display` holds the site URL — exactly what `afterConnect`
 * records in production. Note it holds no credential: the credential is only
 * ever visible to the `sign` hook.
 */
export function mockMetabaseCtx(
  responses: MockResponse[] = [],
  siteUrl: string = SITE_URL,
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.metabase",
    auth: "api-key",
    status: "live",
    display: {
      siteUrl,
      site: { host: "metabase.example.com" },
      user: { id: 2, name: "Reporting bot" },
    },
  };
  return mock;
}

/**
 * A minimal successful query-result envelope, in the shape Metabase actually
 * returns: HTTP **202**, `status: "completed"`, and positional `data.rows`.
 *
 * The 202 is not decoration. Every query test uses it, so an action that ever
 * starts comparing against 200 fails immediately rather than silently working
 * against a mock that lied.
 */
export function queryOk(rows: unknown[][] = [[1]]): MockResponse {
  return {
    status: 202,
    body: {
      status: "completed",
      row_count: rows.length,
      running_time: 4,
      database_id: 1,
      data: {
        rows,
        cols: rows[0]?.map((_, i) => ({ name: `c${i}` })) ?? [],
      },
    },
  };
}
