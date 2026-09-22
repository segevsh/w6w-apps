/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/latest/agents/list");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 *
 * `mockCtx` carries no Connection on purpose, because the auth hooks do not
 * receive one; the Actions resolve their host from it, so they take
 * {@link mockRelevanceCtx}, which records a region id exactly where
 * `afterConnect` puts it in production.
 */
import type { HookContext } from "@w6w/types";

/** The host a connection with region id `f1db6c` resolves to, plus the API version. */
export const API_ROOT = "https://api-f1db6c.stack.tryrelevance.com/latest";

export const REGION_ID = "f1db6c";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. an empty 200). String -> verbatim. */
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

/**
 * Relevance AI resolves the account's host from the Connection, so every Action
 * test needs a ctx carrying one — the region id in `display`, exactly what
 * `auth/api-token.ts`'s `afterConnect` records.
 */
export function mockRelevanceCtx(
  responses: MockResponse[] = [],
  regionId = REGION_ID,
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.relevanceai",
    auth: "api-token",
    status: "live",
    display: { regionId },
  };
  return mock;
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

/** The JSON body a recorded call sent, parsed. */
export function bodyOf(call: CallRecord): Record<string, unknown> {
  return call.body ? JSON.parse(call.body) as Record<string, unknown> : {};
}

/** The vendor's error envelope, in the exact shape observed on the wire. */
export function errorBody(errorType: string, message: string): Record<string, unknown> {
  return { message, error_type: errorType, error_audience: "user" };
}

/**
 * `GetAuthHeaderInfoOutput` — trimmed to the fields this app reads, from the
 * live schema. It carries no credential field of any kind, which is why it is
 * safe for both the probe and the whoami action.
 */
export function authInfo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user_id: "user-1",
    key_id: "key-1",
    email: "jo@acme.test",
    first_name: "Jo",
    last_name: "Ng",
    company: "Acme",
    role: "admin",
    permissions: { project: { "proj-1": "owner" } },
    ...overrides,
  };
}

/**
 * The Better Stack payload from `status.relevanceai.com/index.json`, trimmed
 * from the live 109,987-byte response measured 2026-09-22: the three `API
 * Gateways` resources plus the unrelated sections that must NOT affect this
 * app's verdict.
 */
export function statusPage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    data: {
      attributes: {
        company_name: "Relevance AI",
        company_url: "https://relevanceai.com",
        custom_domain: "status.relevanceai.com",
        subdomain: "relevanceai",
        aggregate_state: "operational",
      },
    },
    included: [
      resource("8771238", "Chat"),
      resource("8545478", "Agent Builder"),
      resource("8541218", "AU API"),
      resource("8541219", "EU API"),
      resource("8559600", "US API"),
      resource("8547793", "OpenAI"),
      resource("8565389", "Orb Billing"),
      resource("8574046", "Pipedream"),
    ],
    ...overrides,
  };
}

function resource(id: string, publicName: string, status = "operational") {
  return {
    id,
    type: "status_page_resource",
    attributes: { public_name: publicName, status, explicit_status: null },
  };
}

export { resource as statusResource };
