/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded. String -> verbatim. */
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
    else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null ? null : String(init.body);
    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    const next = queue.shift();
    if (!next) {
      throw new Error(`mockCtx: unexpected fetch #${calls.length} to ${url} — no queued response`);
    }
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status: next.status ?? 200,
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

/** Public connection metadata as the auth `afterConnect` writes it. */
export const LIVE_BASE =
  "https://1797a841fbb37ca7-AdyenDemo-checkout-live.adyenpayments.com/checkout/v72";
export const TEST_BASE = "https://checkout-test.adyen.com/v72";

/** A mock context whose connection records the environment, base URL and merchant account. */
export function connectionCtx(
  responses: MockResponse[] = [],
  environment: "test" | "live" = "test",
  merchantAccount = "TestMerchant",
): MockCtx {
  const m = mockCtx(responses);
  m.ctx.connection = {
    display: {
      environment,
      baseUrl: environment === "live" ? LIVE_BASE : TEST_BASE,
      merchantAccount,
    },
  } as unknown as typeof m.ctx.connection;
  return m;
}

/** The API path of a recorded URL, without the origin or the `/v72` (or `/checkout/v72`) prefix. */
export function pathOf(url: string): string {
  const u = new URL(url);
  const m = u.pathname.match(/^(?:\/checkout)?\/v72(\/.*)$/);
  if (!m) throw new Error(`unexpected URL ${url}`);
  return m[1];
}
