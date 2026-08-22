import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Plaid's API.
 *
 * Paths and behaviour come from Plaid's reference (`plaid.com/docs/api`) and the
 * hosts, credential placement and error taxonomy were verified live on
 * 2026-08-18.
 *
 * ## Everything is a POST, and the credential goes in the body
 *
 * Plaid takes no `Authorization` header. Every call is a `POST` whose JSON body
 * carries `client_id` and `secret` alongside the request's own arguments —
 * verified: a call without them answers
 * `{"error_code":"INVALID_FIELD","error_message":"client_id must be a properly
 * formatted, non-empty string", …}`.
 *
 * An Action may never touch a credential, so the pair is injected by the auth
 * **`sign` hook**, which is the one hook allowed to hold one and which receives
 * the request *body* as well as its headers. Actions build a body without
 * credentials and never see them.
 *
 * ## Two environments — and the third one is gone
 *
 * `sandbox.plaid.com` and `production.plaid.com` both answer. **`development`
 * does not resolve at all** (verified 2026-08-18: DNS failure, not a 404) —
 * Plaid retired that environment, so an app offering it would be offering
 * something that no longer exists.
 *
 * ## The two-credential model
 *
 * This is the structural thing to understand. A Plaid connection holds the
 * *application's* credentials — one `client_id` and `secret` for the whole
 * integration. But every call about somebody's bank data also needs an
 * **`access_token`**, which identifies one **Item**: one user's connection to
 * one financial institution.
 *
 * Access tokens are therefore **data the workflow holds**, not part of this
 * connection: one connection fans out over thousands of Items. They are also
 * long-lived secrets — anyone holding one can read that person's transactions
 * — so they are declared `type: "secret"` on every action that takes one, and
 * never logged.
 */

/** The two environments that exist. `development` was retired. */
export const HOSTS = {
  sandbox: "https://sandbox.plaid.com",
  production: "https://production.plaid.com",
} as const;

export type Environment = keyof typeof HOSTS;

/** Public (redacted-safe) connection metadata. */
export interface PlaidConnectionDisplay {
  environment?: Environment;
}

export function displayOf(connection: RedactedConnection | undefined): PlaidConnectionDisplay {
  return (connection?.display ?? {}) as PlaidConnectionDisplay;
}

export function hostFor(environment: unknown): string {
  return environment === "production" ? HOSTS.production : HOSTS.sandbox;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** A `yyyy-mm-dd` date, which Plaid's date ranges require. */
export function plaidDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) throw new Error(`\`${field}\` must be a yyyy-mm-dd date; got ${raw}`);
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets `client_id` or `secret` — the
 * runtime routes every request through the auth `sign` hook, which injects them
 * into the body.
 */
export class PlaidClient {
  readonly base: string;
  readonly environment: Environment;

  constructor(private ctx: HookContext) {
    this.environment = displayOf(ctx.connection).environment === "production"
      ? "production"
      : "sandbox";
    this.base = hostFor(this.environment);
  }

  /** Every Plaid call is a POST with a JSON body. */
  async request<T = unknown>(path: string, body: Record<string, unknown> = {}): Promise<T> {
    const res = await this.ctx.fetch(`${this.base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Plaid ${res.status} for POST ${path}: ${describeError(text)}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Turn a Plaid error into something actionable.
 *
 * Plaid's error taxonomy is unusually good and worth surfacing whole: every
 * failure carries an `error_type`, a machine `error_code`, a developer
 * `error_message`, a customer-safe `display_message`, a `documentation_url` and
 * often a `suggested_action`. A workflow that branches on `error_code` can
 * behave correctly; one that reads only the status cannot.
 *
 * The code that matters most is **`ITEM_LOGIN_REQUIRED`**: the user's bank
 * connection has expired and no amount of retrying will fix it — somebody has
 * to re-authenticate through Plaid Link. It is called out by name because
 * treating it as a transient failure is how a sync silently stops working.
 */
export function describeError(text: string): string {
  try {
    const body = JSON.parse(text) as {
      error_type?: string;
      error_code?: string;
      error_message?: string;
      display_message?: string;
      suggested_action?: string;
      documentation_url?: string;
      request_id?: string;
    };
    if (!body?.error_code) return text.slice(0, 300);

    const parts = [`${body.error_code}: ${body.error_message ?? ""}`.trim()];
    if (body.error_code === "ITEM_LOGIN_REQUIRED") {
      parts.push(
        "— this Item's credentials have expired and retrying will not help; the user has to " +
          "reconnect through Plaid Link (create a link token in update mode)",
      );
    }
    if (body.suggested_action) parts.push(`Suggested: ${body.suggested_action}`);
    if (body.documentation_url) parts.push(body.documentation_url);
    if (body.request_id) parts.push(`request_id ${body.request_id}`);
    return parts.join(" ");
  } catch {
    return text.slice(0, 300);
  }
}
