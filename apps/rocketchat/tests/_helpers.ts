/**
 * Test helper: a mock `HookContext` with a queue of canned responses and a record of every call.
 *
 *   const { ctx, calls } = mockCtx([{ body: { success: true } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://acme.rocket.chat/api/v1/me");
 */
import type { ActionDefinition, HookContext } from "@w6w/types";

export const TEST_WORKSPACE = "acme";
export const BASE = `https://${TEST_WORKSPACE}.rocket.chat/api/v1`;

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object → JSON. String → verbatim. Undefined → empty body. */
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
}

export function mockCtx(
  responses: MockResponse[] = [],
  options: { display?: Record<string, unknown> | null } = {},
): MockCtx {
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

  const display = options.display === undefined ? { workspace: TEST_WORKSPACE } : options.display;
  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: () => {},
    ...(display === null ? {} : {
      connection: {
        id: "conn_test",
        app: "io.w6w.rocketchat",
        auth: "personal-access-token",
        owner: "user_test",
        state: "connected",
        createdAt: "2026-10-06T00:00:00.000Z",
        display,
      },
    }),
  };
  return { ctx, calls };
}

/** Run an action against one canned 200 `{ success: true, ...extra }` and return the call. */
export async function run<I>(
  action: ActionDefinition<I>,
  input: I,
  extra: Record<string, unknown> = {},
): Promise<{ call: CallRecord; result: unknown; query: URLSearchParams; json: unknown }> {
  const { ctx, calls } = mockCtx([{ body: { success: true, ...extra } }]);
  const result = await action.execute(input, ctx);
  const u = new URL(calls[0].url);
  return {
    call: calls[0],
    result,
    query: u.searchParams,
    json: calls[0].body ? JSON.parse(calls[0].body) : undefined,
  };
}

export const rcError = (error: string, status = 400) => ({
  status,
  body: { success: false, error, errorType: "error-x" },
});
