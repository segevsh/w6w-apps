/**
 * Square's Connect v2 API. Verified on 2026-08-03 against the vendor's own
 * OpenAPI document (`square/connect-api-specification@master/api.json`, the
 * source the API Reference at developer.squareup.com/reference/square is
 * generated from) and the prose docs it links to.
 *
 * Three things Square is unusual about, and how this app handles each.
 *
 * ## 1. `Square-Version` — pinned here, not per call
 *
 * Every Square response carries a `Square-Version` header naming the API
 * version that served it. On the REQUEST the header is *optional*: omit it and
 * Square applies whatever "default API version" the Developer Console has
 * pinned to the application whose token you are using. That default is a
 * property of somebody else's dashboard, it drifts when they click "upgrade",
 * and it is invisible from here — so an app that omits the header has no idea
 * which contract it is coding against.
 *
 * This client therefore sends {@link SQUARE_VERSION} on **every** request and
 * offers no per-action override. The value is a literal in Square's own spec
 * (`x-fern-global-headers[0].type = literal<"2026-07-15">`, and the same string
 * is the `Square-Version` default on the `oauth2` security scheme), and
 * 2026-07-15 is the newest entry in the release notes at
 * developer.squareup.com/docs/changelog/connect. Bumping it is a deliberate,
 * reviewable edit to one constant — which is the point.
 *
 * ## 2. Sandbox and production are different HOSTS
 *
 *   - production — `connect.squareup.com`
 *   - sandbox    — `connect.squareupsandbox.com`
 *
 * (Both from the spec's `info.x-server-configuration.environments`.) A token
 * is minted for exactly one of them; presenting a sandbox token to production
 * fails with `AUTHENTICATION_ERROR` / `UNAUTHORIZED`. So the environment is a
 * property of the CREDENTIAL, not of a call: it is collected once as an Auth
 * field and echoed onto the Connection's redacted `display` by `afterConnect`,
 * which is where this client reads it from. Actions never see the credential,
 * only that display value — and cannot accidentally point a live token at the
 * sandbox host.
 *
 * Both hosts are on `w6w.network.allow`; Square's `custom_url` server variable
 * (a third "environment" in the spec, for Square's own internal proxying) is
 * deliberately unsupported — it would mean a `"*"` egress allowlist.
 *
 * ## 3. Errors and pagination
 *
 * Failures come back as `{ "errors": [{ category, code, detail?, field? }] }`
 * with `category` from a fixed enum (`API_ERROR`, `AUTHENTICATION_ERROR`,
 * `INVALID_REQUEST_ERROR`, `RATE_LIMIT_ERROR`, `PAYMENT_METHOD_ERROR`,
 * `REFUND_ERROR`, `MERCHANT_SUBSCRIPTION_ERROR`, `EXTERNAL_VENDOR_ERROR`).
 * Note the plural: one 400 can carry several field errors, so all of them are
 * surfaced rather than just the first.
 *
 * Paging is opaque-cursor, never offset: a list/search response carries
 * `cursor` when more results exist and OMITS it on the final page. The cursor
 * is echoed straight back on the next call. Every list action here exposes
 * `cursor` in and `cursor` out, so a workflow drives the loop itself.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * The Square API version this app targets, sent as `Square-Version` on every
 * request. See the header discussion above before changing it.
 */
export const SQUARE_VERSION = "2026-07-15";

/** Square's two published API hosts, keyed by the value stored on the Connection. */
export const API_HOSTS = {
  production: "connect.squareup.com",
  sandbox: "connect.squareupsandbox.com",
} as const;

export type Environment = keyof typeof API_HOSTS;

export const DEFAULT_ENVIRONMENT: Environment = "production";

/** Square's OAuth2 endpoints live on the API host, under `/oauth2`. See auth/access-token.ts. */
export const OAUTH_AUTHORIZE_PATH = "/oauth2/authorize";
export const OAUTH_TOKEN_PATH = "/oauth2/token";

/** Normalise a stored environment value, falling back to production. */
export function environment(value: string | undefined): Environment {
  return value === "sandbox" ? "sandbox" : DEFAULT_ENVIRONMENT;
}

/** Map an environment onto its host. Anything unrecognised resolves to production. */
export function hostForEnvironment(value: string | undefined): string {
  return API_HOSTS[environment(value)];
}

/** Every path in this app is under `/v2`; the version prefix lives here, once. */
export function baseUrl(host: string): string {
  return `https://${host}/v2`;
}

/**
 * The environment this Connection was made for. `display` is redacted
 * Connection metadata recorded by the auth method's `afterConnect` hook — never
 * the credential.
 */
export function environmentFromConnection(connection: RedactedConnection | undefined): Environment {
  const display = (connection?.display ?? {}) as { environment?: string };
  return environment(display.environment);
}

/** The API host this Connection talks to. */
export function hostFromConnection(connection: RedactedConnection | undefined): string {
  return API_HOSTS[environmentFromConnection(connection)];
}

/** One entry of Square's error envelope. */
export interface SquareError {
  category?: string;
  code?: string;
  detail?: string;
  field?: string;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON request body. Undefined/null/"" members are dropped by {@link compact}. */
  body?: Record<string, unknown>;
}

/**
 * Drop keys the caller left unset so a POST/PUT does not send nulls Square
 * would reject, or blank strings that would clear a field the user never
 * touched. Applied one level deep only — nested objects (`amount_money`,
 * `address`) are built deliberately by the caller and passed through intact.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Square amounts are integers in the currency's smallest denomination, paired
 * with an ISO 4217 code: `{ amount: 1000, currency: "USD" }` is $10.00.
 * Returns undefined when there is nothing to send.
 */
export function money(
  amount: number | undefined,
  currency: string | undefined,
): { amount: number; currency: string } | undefined {
  if (amount === undefined || amount === null) return undefined;
  if (!currency) throw new Error("A currency is required alongside an amount.");
  return { amount, currency: currency.toUpperCase() };
}

/**
 * Parse a JSON param that must be an object (Square's nested request bodies —
 * `address`, `order`, `query`). Returns undefined when empty so it is not sent.
 */
export function jsonObject(raw: unknown, label: string): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`\`${label}\` must be a JSON object.`);
  }
  return Object.keys(obj as object).length ? obj as Record<string, unknown> : undefined;
}

/**
 * Square's idempotency keys, modelled honestly.
 *
 * `idempotency_key` is a REQUIRED body field on `CreatePayment` (max 45 chars)
 * and `RefundPayment` (max 45), and an OPTIONAL one on `CreateOrder` (max 192)
 * and `CreateCustomer`. It is a body field, never a header — Square has no
 * `Idempotency-Key` header, unlike Stripe.
 *
 * The value used is, in order:
 *
 *   1. an explicit `idempotencyKey` param, when the workflow author wants to
 *      own the dedupe window themselves (e.g. keying on their own order id);
 *   2. otherwise `ctx.invocation.invocationId` — the host-issued id of THIS
 *      call. A retried invocation reuses it, so Square replays the original
 *      response instead of taking a second payment. This is precisely what the
 *      field is for, and why those actions declare `idempotent: true`.
 *
 * There is deliberately no third fallback. Generating a random key would make
 * every retry a fresh charge while still LOOKING idempotent, so when neither
 * source is available this throws — a loud failure beats a silent double
 * payment. For the same reason an over-long key is rejected rather than
 * truncated: truncation invents collisions.
 */
export function idempotencyKey(
  ctx: HookContext,
  override: string | undefined,
  maxLength: number,
): string {
  const key = (override ?? "").trim() || ctx.invocation?.invocationId;
  if (!key) {
    throw new Error(
      "Square requires an idempotency key for this call, and none is available: " +
        "the host supplied no invocation id. Set the `idempotencyKey` param explicitly.",
    );
  }
  if (key.length > maxLength) {
    throw new Error(
      `Square limits this idempotency key to ${maxLength} characters; got ${key.length}. ` +
        "Set a shorter `idempotencyKey` param.",
    );
  }
  return key;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * It never sets Authorization — the runtime routes every request through the
 * auth `sign` hook, which is the only code handed the credential. What it DOES
 * set on every request is `Square-Version`, so no action can forget it and no
 * action can override it.
 */
export class SquareClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(hostFromConnection(ctx.connection));
  }

  /** The API host this client is pointed at. */
  get host(): string {
    return new URL(this.base).host;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = (options.method ?? (options.body ? "POST" : "GET")).toUpperCase();
    const headers: Record<string, string> = {
      accept: "application/json",
      "square-version": SQUARE_VERSION,
    };

    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.body));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    let parsed: Record<string, unknown> | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        // Non-JSON body — fall through to the status-only error below.
      }
    }

    // A 200 can still carry `errors` (partial failures on the batch endpoints),
    // but only a non-2xx is a failed call; surface every error either way.
    const errors = Array.isArray(parsed?.errors) ? parsed.errors as SquareError[] : [];
    if (!res.ok) {
      const detail = errors.length
        ? errors.map((e) =>
          [e.category, e.code, e.field && `(${e.field})`, e.detail].filter(Boolean).join(" ")
        ).join("; ")
        : (text ? text.slice(0, 300) : res.statusText);
      throw new Error(`Square ${res.status} for ${method} ${url.pathname}: ${detail}`);
    }

    if (!text) return undefined as T;
    return (parsed ?? {}) as T;
  }
}
