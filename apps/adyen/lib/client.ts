import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Adyen Checkout API v72 client.
 *
 * Verified 2026-10-05 against Adyen's own OpenAPI document
 * (`Adyen/adyen-openapi`, `json/CheckoutService-v72.json`, `info.version` 72,
 * single declared server `https://checkout-test.adyen.com/v72`) and Adyen's
 * "Live endpoints" page (docs.adyen.com/development-resources/live-endpoints).
 *
 * ## Two environments, two URL shapes
 *
 *   - **test** — `https://checkout-test.adyen.com/v72/{method}`
 *   - **live** — `https://{prefix}-checkout-live.adyenpayments.com/checkout/v72/{method}`
 *
 * Note the live URL carries a `/checkout` segment the test URL does not. The
 * prefix is merchant-specific: "a hex-encoded random part and your company
 * name" (`1797a841fbb37ca7-AdyenDemo`), shown in the live Customer Area under
 * Developers > API URLs > Prefix. It becomes a hostname label, so it is
 * validated to a safe label before any request is built (see
 * {@link normalizePrefix}).
 *
 * Adyen also offers "location-based live endpoints" (for example US or AU data
 * centres), arranged through Adyen Support. The docs do not publish that
 * hostname shape, so this app does not model it.
 *
 * ## Errors
 *
 * Every failure is a `ServiceError`:
 * `{status, errorCode, message, errorType, pspReference?}`. `errorType` is one
 * of `security`, `validation`, `configuration`, ... and `errorCode` is the
 * stable machine code. {@link formatAdyenError} surfaces both, because the fix
 * differs per code and a flattened "HTTP 403" hides which one you hit.
 *
 * ## Idempotency
 *
 * Every POST accepts an `Idempotency-Key` header ("a unique identifier for the
 * message with a maximum of 64 characters (we recommend a UUID)"). The client
 * sends the workflow invocation id when there is one, so a retried step cannot
 * charge or refund twice.
 */

export const API_VERSION = "v72";
export const TEST_BASE = `https://checkout-test.adyen.com/${API_VERSION}`;
export const LIVE_HOST_SUFFIX = "-checkout-live.adyenpayments.com";

export type Environment = "test" | "live";

/** Public (redacted-safe) connection metadata, written by the auth `afterConnect`. */
export interface AdyenDisplay {
  environment?: Environment;
  baseUrl?: string;
  merchantAccount?: string;
}

/** A DNS label may be 63 characters; the fixed `-checkout-live` part takes 14 of them. */
const MAX_PREFIX = 49;
const LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/**
 * Turn what a user typed into a live URL prefix, or throw.
 *
 * Accepts the bare prefix (`1797a841fbb37ca7-AdyenDemo`) or a pasted live URL
 * of the documented shape. The prefix ends up inside a hostname, so anything
 * that is not a plain hostname label (a dot, slash, colon, `@`, whitespace,
 * `..`) is refused: otherwise a crafted value could steer the credential to
 * another host.
 */
export function normalizePrefix(raw: unknown): string {
  let value = String(raw ?? "").trim();
  if (!value) throw new Error("Adyen live URL prefix is empty");

  if (/^https?:\/\//i.test(value) || value.includes(".")) {
    const m = value.match(
      /^(?:https:\/\/)?([^./:@\s]+)-checkout-live\.adyenpayments\.com(?:[/?#].*)?$/i,
    );
    if (!m) {
      throw new Error(
        "paste either the bare live URL prefix (for example 1797a841fbb37ca7-AdyenDemo) or a URL " +
          "of the form https://{prefix}-checkout-live.adyenpayments.com/checkout/v72/...",
      );
    }
    value = m[1];
  }
  if (value.length > MAX_PREFIX) {
    throw new Error(
      `Adyen live URL prefix is too long (${value.length} > ${MAX_PREFIX} characters)`,
    );
  }
  if (!LABEL.test(value)) {
    throw new Error(
      "Adyen live URL prefix may contain only letters, digits and hyphens " +
        "(for example 1797a841fbb37ca7-AdyenDemo)",
    );
  }
  return value;
}

/** The Checkout API base URL (no trailing slash) for an environment. */
export function baseUrlFor(environment: Environment, prefix?: string): string {
  if (environment === "test") return TEST_BASE;
  return `https://${normalizePrefix(prefix)}${LIVE_HOST_SUFFIX}/checkout/${API_VERSION}`;
}

const LIVE_BASE_RE = new RegExp(
  `^https://[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?${
    LIVE_HOST_SUFFIX.replaceAll(".", "\\.")
  }/checkout/${API_VERSION}$`,
);

/** Read the base URL off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as AdyenDisplay;
  const url = display.baseUrl;
  if (url && (url === TEST_BASE || LIVE_BASE_RE.test(url))) return url;
  throw new Error(
    "this Adyen connection records no valid Checkout base URL — reconnect it so the " +
      "environment and live URL prefix can be stored",
  );
}

/** The merchant account: the action's own value, else the connection's. */
export function merchantAccountFor(
  input: unknown,
  connection: RedactedConnection | undefined,
): string {
  const own = String(input ?? "").trim();
  if (own) return own;
  const fromConnection = String(
    ((connection?.display ?? {}) as AdyenDisplay).merchantAccount ?? "",
  ).trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "merchantAccount is required: set it on the action or store one on the connection",
  );
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface ServiceError {
  status?: number;
  errorCode?: string;
  errorType?: string;
  message?: string;
  pspReference?: string;
}

/** Keep an error message readable. */
function clip(s: string, n = 400): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** Parse a `ServiceError` body, or `null` when the body is not one. */
export function parseServiceError(text: string): ServiceError | null {
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v)) return v as ServiceError;
  } catch { /* not JSON */ }
  return null;
}

export function formatAdyenError(status: number, text: string): string {
  const e = parseServiceError(text);
  if (!e || (!e.message && !e.errorCode)) {
    return `HTTP ${status}${text ? `: ${clip(text.trim())}` : ""}`;
  }
  const bits = [e.errorType, e.errorCode ? `code ${e.errorCode}` : undefined].filter(Boolean);
  return `HTTP ${status}${bits.length ? ` (${bits.join(", ")})` : ""}: ${e.message ?? ""}` +
    (e.pspReference ? ` [pspReference ${e.pspReference}]` : "");
}

/** Drop keys the caller left unset. `false` and `0` survive — they are meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Percent-encode one path segment (a PSP reference, link id, token id). */
export function encodeId(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("a required identifier is empty");
  return encodeURIComponent(s);
}

export interface BodySpec {
  /** Input keys copied to the body as they are. */
  fields?: string[];
  /** Input keys holding JSON (object, array or a JSON string), parsed first. */
  json?: string[];
  /**
   * Send `{currency, value}` from `input.currency` / `input.value` as `amount`.
   * `"optional"` skips it when both are empty; one without the other is an error.
   */
  amount?: boolean | "optional";
  /** Include the merchant account (defaults to true). */
  merchant?: boolean;
}

/**
 * Build a request body from an action's input.
 *
 * `additionalFields` is the escape hatch for any documented field the action
 * does not model; it is merged **under** the modelled fields, so a typed param
 * always wins over a stray duplicate.
 */
export function buildBody(
  ctx: HookContext,
  rawInput: object,
  spec: BodySpec,
): Record<string, unknown> {
  const input = rawInput as Record<string, unknown>;
  const body: Record<string, unknown> = {};
  if (spec.merchant !== false) {
    body.merchantAccount = merchantAccountFor(input.merchantAccount, ctx.connection);
  }
  const hasAmount = input.currency !== undefined && input.currency !== "" &&
    input.value !== undefined && input.value !== null && input.value !== "";
  if (spec.amount === "optional" && !hasAmount) {
    if ((input.currency ?? "") !== "" || (input.value ?? "") !== "") {
      throw new Error("currency and value must be given together");
    }
  } else if (spec.amount) {
    const value = Number(input.value);
    const currency = String(input.currency ?? "").trim().toUpperCase();
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("value must be a whole number of minor units (for example 1000 = 10.00)");
    }
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a 3-letter ISO 4217 code");
    body.amount = { currency, value };
  }
  for (const k of spec.fields ?? []) body[k] = input[k];
  for (const k of spec.json ?? []) body[k] = asOptionalJson(input[k], k);
  const extra = asOptionalJson<Record<string, unknown>>(input.additionalFields, "additionalFields");
  if (extra && (typeof extra !== "object" || Array.isArray(extra))) {
    throw new Error("additionalFields must be a JSON object");
  }
  return { ...(extra ?? {}), ...compact(body) };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the API key — the runtime routes
 * every request through the auth `sign` hook, which stamps `X-API-Key`.
 */
export class AdyenClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const key = this.ctx.invocation?.invocationId;
    if (method === "POST" && key && key.length <= 64) headers["idempotency-key"] = key;

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `Adyen ${method} ${url.pathname} failed: ${formatAdyenError(res.status, text)}`,
      );
    }
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Adyen answered ${method} ${url.pathname} with ${res.status} but not JSON — is a proxy ` +
          "or login page in the way?",
      );
    }
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }

  delete<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>("DELETE", path, { query });
  }
}
