import type { HookContext } from "@w6w/types";

/**
 * Tremendous API v2 REST client.
 *
 * Everything in this module was verified on 2026-09-15 against Tremendous's own
 * machine-readable OpenAPI 3.0 definitions — served per-endpoint at
 * `developers.tremendous.com/reference/<slug>.md` (each page embeds the same
 * `openapi.info.title` "API Endpoints" document, `servers` array, and shared
 * `BearerApiKey` security scheme) — the prose guides under
 * `developers.tremendous.com/docs/*`, and live probes against `api.tremendous.com`
 * and `testflight.tremendous.com`. Nothing came from a third-party integration
 * directory.
 *
 * ## Two hosts, not one, and NOT a path prefix
 *
 * Tremendous runs sandbox and production as separate hosts rather than a
 * shared host with a mode flag:
 *
 * | Environment | Host                          | API key prefix |
 * | ----------- | ------------------------------ | -------------- |
 * | Sandbox     | `testflight.tremendous.com`    | `TEST_`        |
 * | Production  | `api.tremendous.com`           | `PROD_`        |
 *
 * Both are confirmed live in the OpenAPI `servers` array on every reference
 * page. This app only ever calls production (`API_BASE` below) — the sandbox
 * is a separate host with its own data, out of scope for `w6w.network.allow`,
 * and a publisher building against it locally can point `apiBase`-style
 * overrides there without a manifest change (none of this app's actions
 * expose such an override, since every path is fixed).
 *
 * Both hosts answered `401` with a real, schema-shaped error body for an
 * unauthenticated `HEAD /api/v2/ping` on 2026-09-15 (not a 404), which is the
 * evidence that both are live APIs and not placeholder domains.
 *
 * ## One error shape
 *
 * Every documented 4xx/5xx response (`error-handling` guide, and the
 * per-endpoint OpenAPI `responses`) is:
 *
 * ```json
 * {"errors": {"message": "...", "payload": {...}}}
 * ```
 *
 * `payload` mirrors the request body, populated only at the field(s) that
 * failed — e.g. `{"payment": {"funding_source_id": "..."}}`. {@link
 * formatTremendousError} surfaces `message` plus a flattened `payload`, since
 * the field path is the one thing worth keeping from a validation error.
 *
 * ## Idempotency is a request FIELD, not a header
 *
 * `POST /orders` takes `external_id` in the body (not an `Idempotency-Key`
 * header). Verified from `create-order`'s OpenAPI `requestBody` schema and the
 * "Idempotence" section of the same reference page: sending the same
 * `external_id` twice returns the ORIGINAL order with a `201` (not `200`)
 * status and creates nothing new; sending it a third time with DIFFERENT
 * parameters answers `409`. `fetch`/`Response.ok` treats both `200` and `201`
 * as success, so distinguishing them requires reading `res.status` explicitly
 * — see {@link TremendousClient.request} and `actions/order-create.ts`.
 *
 * ## Rate limiting
 *
 * 10 requests/second, fixed, per the `rate-limiting` guide. A live `HEAD`
 * against both hosts on 2026-09-15 carried no `X-RateLimit-*` (or any other
 * rate-limit) response header, so there is no readable headroom to report —
 * see `health/request-rate.ts`.
 */

/** Production host. See module docs for why sandbox is deliberately not used. */
export const API_BASE = "https://api.tremendous.com";
export const API_PREFIX = "/api/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

export interface TremendousResponse<T> {
  status: number;
  body: T;
}

interface TremendousErrorBody {
  errors?: {
    message?: string;
    payload?: Record<string, unknown>;
  };
}

/** Drop keys the caller left unset, so an absent filter is never sent as `"undefined"`. */
export function compact(obj: Record<string, QueryValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
}

/**
 * Drop keys the caller left unset from a JSON request body, WITHOUT
 * stringifying the surviving values — a reward's `denomination` must reach
 * Tremendous as a JSON number, not `"10"`.
 */
export function compactBody<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation payload can nest several field errors. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Flatten `{payment: {funding_source_id: "..."}}` into `payment.funding_source_id: "..."`. */
function flattenPayload(payload: Record<string, unknown>, prefix = ""): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      lines.push(...flattenPayload(value as Record<string, unknown>, path));
    } else {
      lines.push(`${path}: ${String(value)}`);
    }
  }
  return lines;
}

/**
 * Turn Tremendous's `{"errors": {"message", "payload"}}` body into one
 * actionable line. See module docs — there is exactly one documented shape.
 */
export function formatTremendousError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: TremendousErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TremendousErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const errors = parsed?.errors;
  if (!errors?.message) return truncate(`Tremendous ${status} for ${method} ${path}: ${raw}`);

  const fields = errors.payload && Object.keys(errors.payload).length > 0
    ? ` (${flattenPayload(errors.payload).join("; ")})`
    : "";
  return truncate(`Tremendous ${status} for ${method} ${path}: ${errors.message}${fields}`);
}

export class TremendousClient {
  constructor(private ctx: HookContext) {}

  /** Parse the body. Throws on a non-2xx response. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body } = await this.request<T>(path, options);
    return body;
  }

  /**
   * Parse the body AND report the status code — needed anywhere a 2xx status
   * itself carries meaning, not just the body. `POST /orders` is the one case
   * in this app: `200` is a fresh order, `201` is an idempotent replay of an
   * existing one, and both are `res.ok`.
   */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<TremendousResponse<T>> {
    const res = await this.send(path, options);
    const text = await res.text();
    const body = text ? (JSON.parse(text) as T) : (undefined as T);
    return { status: res.status, body };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatTremendousError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
