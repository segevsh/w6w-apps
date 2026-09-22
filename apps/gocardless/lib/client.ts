import type { HookContext } from "@w6w/types";

/**
 * GoCardless REST client.
 *
 * Every path, header, query parameter and body field in this module was read
 * from GoCardless's own OpenAPI 3.1 document
 * (`https://docs.gocardless.com/openapi-schema-public.json`, `info.version`
 * `2015-07-06`, fetched 2026-09-22) plus the prose docs at
 * `https://docs.gocardless.com/docs/api-reference/*`. Nothing here came from a
 * third-party integration directory, and nothing was inferred from a sibling
 * app in this pack.
 *
 * ## Two hosts, and the credential does not pick between them
 *
 * GoCardless runs **live** (`api.gocardless.com`) and **sandbox**
 * (`api-sandbox.gocardless.com`) as "completely separate" environments — its
 * own words — each with "its own account, dashboard, access tokens, and API
 * URLs". Unlike Paddle's `pdl_live_…` / `pdl_sdbx_…` keys, a GoCardless access
 * token is a bare opaque hex string with no environment marker in it, so the
 * environment is an explicit Auth field and `auth/access-token.ts`'s `sign`
 * hook rewrites the hostname of every outbound request from it.
 *
 * That means every URL this client builds starts at the **live** origin and is
 * redirected inside `sign` when the Connection chose sandbox. Building the URL
 * from `ctx.connection` instead would not work: a Connection's stored fields
 * are not readable from an Action.
 *
 * ## The envelope is the resource's own plural name
 *
 * Every request body and every single-resource response wraps the resource
 * under its pluralized snake_case name — `POST /customers` sends
 * `{"customers": {…}}` and `GET /customers/{id}` answers `{"customers": {…}}`.
 * There is no `data` wrapper here (that is Apify's and Paddle's shape, not
 * GoCardless's), which is why {@link envelope} is keyed by resource name.
 *
 * A list response is `{"<resource>": [...], "meta": {"cursors": {"before",
 * "after"}, "limit"}}` — see {@link ListPage}.
 *
 * ## Errors are classified by BODY, never by status alone
 *
 * Every failure is
 * `{"error": {type, code, message, documentation_url, request_id, errors: []}}`
 * where `type` is one of `invalid_api_usage`, `invalid_state`,
 * `validation_failed`, `gocardless`, and each item of `errors` carries a
 * `reason` (or, for `validation_failed`, a `field`). A bare "HTTP 401" cannot
 * distinguish "the token is wrong" from "no Authorization header arrived",
 * which are different problems with different fixes — {@link
 * formatGoCardlessError} therefore renders the vendor's own code.
 *
 * ## No credential ever passes through this module
 *
 * The client sets `accept`, `content-type` and `idempotency-key` and nothing
 * else. `Authorization` and `GoCardless-Version` are stamped by the Auth `sign`
 * hook, which is the only place the credential is readable.
 */

/** The two environments, as named in the Auth field and in `sign`. */
export type GoCardlessEnvironment = "live" | "sandbox";

/**
 * The two API origins. GoCardless publishes them as separate servers in its
 * OpenAPI document (`components.servers` names both) and its prose docs state
 * plainly that the two environments share nothing.
 */
export const API_HOSTS: Record<GoCardlessEnvironment, string> = {
  live: "api.gocardless.com",
  sandbox: "api-sandbox.gocardless.com",
};

/** The live origin. `sign` rewrites the hostname to sandbox when the Connection chose it. */
export const API_BASE = `https://${API_HOSTS.live}`;

/**
 * `GoCardless-Version: 2015-07-06` — **required on every request**, and the one
 * value that never varies. GoCardless answers `400 missing_version_header`
 * without it and `400 version_not_found` for a version it does not recognise.
 *
 * It is declared here (rather than only in `auth/access-token.ts`) so a test can
 * assert the exact pinned version and so the quota health check's own call
 * documents the same constant. The value is GoCardless's own API generation,
 * not a date this app chose.
 */
export const GOCARDLESS_VERSION = "2015-07-06";

/** Which host serves an environment. Anything unrecognised falls back to live. */
export function hostForEnvironment(environment: unknown): string {
  return environment === "sandbox" ? API_HOSTS.sandbox : API_HOSTS.live;
}

/** The origin for an environment, including the scheme. */
export function baseUrlFor(environment: unknown): string {
  return `https://${hostForEnvironment(environment)}`;
}

/**
 * Normalise the stored `environment` field to one of the two known values.
 *
 * A Connection created before the field existed, or one whose value was
 * hand-edited, must not send requests to `https://undefined`. Defaulting to
 * live is the same default the Auth field declares.
 */
export function environmentOf(value: unknown): GoCardlessEnvironment {
  return value === "sandbox" ? "sandbox" : "live";
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `Idempotency-Key` when set. Creates only — see {@link GoCardlessClient.create}. */
  idempotencyKey?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive deliberately: `action_required=false` and an amount of
 * `0` are both values a caller means, and `?action_required=` (empty) is not the
 * same request as `?action_required=false`.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Wrap a body under GoCardless's pluralized resource key. */
export function envelope(
  resource: string,
  body: Record<string, unknown> = {},
): Record<string, unknown> {
  return { [resource]: body };
}

/**
 * Keep an error message readable — a `validation_failed` body can list dozens of
 * fields, and the raw body is the fallback when the envelope does not parse.
 */
export function truncate(text: string, max = 1000): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site. GoCardless validates
 * `metadata` as an object, so a raw JSON string must be parsed before it is
 * sent — otherwise the vendor rejects the whole request with a
 * `validation_failed` about a field the user thought they had filled in.
 */
export function asOptionalJson<T = unknown>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Escape a caller-supplied resource id for a path segment.
 *
 * GoCardless ids are documented prefixed identifiers (`CU1234`, `MD0000…`,
 * `PM…`, `SB…`), so nothing legal is escaped here. `encodeURIComponent` still
 * neutralises a `/` or `?` pasted into an id field, which would otherwise let a
 * value address a different endpoint than the action's own.
 */
export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** One page of a GoCardless list endpoint, with the cursors lifted out of `meta`. */
export interface ListPage<T> {
  items: T[];
  /** Pass back as `before` to walk towards newer records. `null` = no such cursor. */
  beforeCursor: string | null;
  /** Pass back as `after` to walk towards older records. `null` = end of the collection. */
  afterCursor: string | null;
  /** The page size GoCardless actually applied. */
  limit?: number;
}

/** `error.errors[]` — `reason` for most types, `field` for `validation_failed`. */
export interface GoCardlessErrorItem {
  reason?: string;
  field?: string;
  message?: string;
  request_pointer?: string;
  links?: { conflicting_resource_id?: string };
}

/** The documented `error` object, in the exact shape GoCardless sends it. */
export interface GoCardlessErrorDetail {
  type?: string;
  code?: number;
  message?: string;
  documentation_url?: string;
  request_id?: string;
  errors?: GoCardlessErrorItem[];
}

interface GoCardlessErrorEnvelope {
  error?: GoCardlessErrorDetail;
}

/**
 * Parse GoCardless's error envelope, or `undefined` when the body is not JSON
 * or carries no `error` object.
 *
 * Returns the whole `error` object rather than a flattened string, because the
 * auth probe needs the individual `reason` codes and `sign` — not this module —
 * decides what they mean.
 */
export function parseGoCardlessError(raw: string): GoCardlessErrorDetail | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as GoCardlessErrorEnvelope;
    return parsed?.error && typeof parsed.error === "object" ? parsed.error : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The vendor's own machine-readable code for a failure, preferring `reason` and
 * falling back to `field` (`validation_failed` items carry `field`, not
 * `reason`).
 */
export function errorCodeOf(detail: GoCardlessErrorDetail | undefined): string | undefined {
  const first = detail?.errors?.[0];
  return first?.reason ?? first?.field;
}

/** The conflicting resource id a `409 idempotent_creation_conflict` points at. */
export function conflictingResourceIdOf(
  detail: GoCardlessErrorDetail | undefined,
): string | undefined {
  const first = detail?.errors?.[0];
  if (first?.reason !== "idempotent_creation_conflict") return undefined;
  return first.links?.conflicting_resource_id;
}

/**
 * Turn an error body into one actionable line:
 *
 *     GoCardless <code> <type>[/<reason>] for <METHOD> <path>: <message>
 *
 * The `<code>` is GoCardless's own `error.code` when the body states one (it
 * mirrors the HTTP status), and the bracketed token is the vendor's `reason` —
 * kept verbatim, because that is what GoCardless's troubleshooting is written
 * against and what `auth/access-token.ts` classifies on.
 *
 * Two cases get extra prose because a bare code is not actionable on its own:
 *
 *  - **`409 idempotent_creation_conflict`** — the vendor's error body points at
 *    the resource the key already created
 *    (`error.errors[0].links.conflicting_resource_id`). The whole point of the
 *    idempotency key is to find that resource, so its id is printed: without it
 *    a retry storm reads as an unexplained 409.
 *  - **A body that does not parse** — the raw body is shown instead. This is the
 *    only path on which non-vendor text reaches a message, and it is the caller's
 *    own request that produced it.
 *
 * The credential never enters this module, so it cannot appear here.
 */
export function formatGoCardlessError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const detail = parseGoCardlessError(raw);
  if (!detail) {
    return raw.trim()
      ? truncate(`GoCardless ${status} for ${method} ${path}: ${raw.trim()}`)
      : `GoCardless ${status} for ${method} ${path} (empty response body)`;
  }

  const code = typeof detail.code === "number" ? detail.code : status;
  const reason = errorCodeOf(detail);
  const label = `GoCardless ${code} ${detail.type ?? "error"}${
    reason ? `/${reason}` : ""
  } for ${method} ${path}`;

  const conflicting = conflictingResourceIdOf(detail);
  const first = detail.errors?.[0];
  const parts = [label, detail.message];
  if (conflicting) {
    parts.push(`already created resource ${conflicting}`);
  } else if (first?.message && first.message !== detail.message) {
    parts.push(first.message);
  }
  return truncate(parts.filter(Boolean).join(": "));
}

/**
 * A failed GoCardless call, with the vendor's own classification kept as fields
 * so a caller can branch on it without re-parsing the message.
 */
export class GoCardlessApiError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  readonly type?: string;
  readonly reason?: string;
  readonly conflictingResourceId?: string;

  constructor(args: {
    status: number;
    method: string;
    path: string;
    message: string;
    detail?: GoCardlessErrorDetail;
  }) {
    super(args.message);
    this.name = "GoCardlessApiError";
    this.status = args.status;
    this.method = args.method;
    this.path = args.path;
    this.type = args.detail?.type;
    this.reason = errorCodeOf(args.detail);
    this.conflictingResourceId = conflictingResourceIdOf(args.detail);
  }
}

/**
 * The idempotency key actually sent on a create.
 *
 * GoCardless requires no `Idempotency-Key`, but its own guidance is to "always
 * use idempotency keys when creating payments or mandates", because "a network
 * timeout that causes you to retry without one can result in the same payment
 * being taken twice". `ctx.invocation.invocationId` is stable across retries of
 * one workflow step and is exactly the "random string with enough entropy" the
 * vendor asks for, so it is the fallback whenever the caller left the field
 * blank. `undefined` means no header at all — an Action invoked outside a run
 * has no invocation id.
 */
export function resolveIdempotencyKey(value: unknown, ctx: HookContext): string | undefined {
  const typed = typeof value === "string" ? value.trim() : "";
  return typed || ctx.invocation?.invocationId;
}

export class GoCardlessClient {
  constructor(private ctx: HookContext) {}

  /**
   * A list read: unwraps the resource array and lifts the cursors out of `meta`.
   *
   * The cursors are returned as `afterCursor` / `beforeCursor` rather than as
   * the raw `meta` object so every `list-*` action in this app reports the same
   * four output columns, and a workflow pages by feeding one step's
   * `afterCursor` into the next step's `after` param.
   */
  async list<T = Record<string, unknown>>(
    resource: string,
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<ListPage<T>> {
    const body = await this.json<
      Record<string, unknown> & {
        meta?: { cursors?: { before?: string | null; after?: string | null }; limit?: number };
      }
    >(path, { query });

    const raw = body?.[resource];
    return {
      items: Array.isArray(raw) ? raw as T[] : [],
      beforeCursor: body?.meta?.cursors?.before ?? null,
      afterCursor: body?.meta?.cursors?.after ?? null,
      limit: body?.meta?.limit,
    };
  }

  /**
   * A single-resource read: `{"<resource>": {…}}` in, the resource out.
   *
   * The defensive fallback to the whole body mirrors Apify's `data()`: if a
   * future API revision drops the wrapper, returning the unpicked body is
   * visibly wrong to a reader, where an empty object would look like an empty
   * resource.
   */
  async one<T = Record<string, unknown>>(
    resource: string,
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<T> {
    const body = await this.json<Record<string, unknown>>(path, { query });
    const value = body?.[resource];
    return (value === undefined ? body : value) as T;
  }

  /**
   * A resource-creating `POST`, which is the only place an `Idempotency-Key` is
   * sent.
   *
   * The key is resolved here rather than in each of the four create actions so
   * the fallback to `ctx.invocation.invocationId` cannot be forgotten in one of
   * them — a forgotten key on `create-payment` is a double debit.
   */
  async create<T = Record<string, unknown>>(
    resource: string,
    path: string,
    body: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<T> {
    const response = await this.json<Record<string, unknown>>(path, {
      method: "POST",
      body: envelope(resource, body),
      idempotencyKey: resolveIdempotencyKey(idempotencyKey, this.ctx),
    });
    const value = response?.[resource];
    return (value === undefined ? response : value) as T;
  }

  /**
   * A `POST …/actions/…` state change (cancel a mandate, payment or
   * subscription).
   *
   * The empty envelope — `{"payments": {}}` — is sent rather than no body at
   * all, because every request body in this API takes the same shape and a
   * body-less POST is the one request GoCardless's own examples never show. No
   * `Idempotency-Key` is sent: these endpoints are not creates, and GoCardless
   * treats a repeated cancel as `invalid_state`, not as a no-op.
   */
  async action<T = Record<string, unknown>>(
    resource: string,
    path: string,
  ): Promise<T> {
    const response = await this.json<Record<string, unknown>>(path, {
      method: "POST",
      body: envelope(resource),
    });
    const value = response?.[resource];
    return (value === undefined ? response : value) as T;
  }

  /**
   * The parsed response body, with no unwrapping.
   *
   * Public because it is the one entry point a test needs to assert the wire
   * format (methods, headers, query) without going through an Action.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `GoCardless returned a body that is not JSON for ${options.method ?? "GET"} ${path}`,
      );
    }
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      // GoCardless answers `415 unsupported_media_type` for a body without this
      // header, so it is set whenever a body is.
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new GoCardlessApiError({
        status: res.status,
        method,
        path,
        message: formatGoCardlessError(res.status, method, path, raw),
        detail: parseGoCardlessError(raw),
      });
    }
    return res;
  }
}
