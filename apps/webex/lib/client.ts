import type { HookContext } from "@w6w/types";

/**
 * Webex Messaging REST API client (`webexapis.com/v1`).
 *
 * Verified on 2026-09-29 against the vendor's own API reference, read directly
 * out of `developer.webex.com`'s embedded OpenAPI-shaped specs (`People`,
 * `Rooms`, `Messages`, `Memberships`, `Teams`, `Team Memberships`,
 * `Webhooks` — each page's `window.__INITIAL_STATE__.apiReference` carries a
 * per-operation OpenAPI 3.0.3 fragment with `servers: [{url:
 * "https://webexapis.com/v1/"}]`), plus live probes against `webexapis.com`
 * on the same day.
 *
 * ## One host, one auth scheme
 *
 * Every operation in this app's surface lives under `https://webexapis.com/v1`
 * and is secured by `Authorization: Bearer <token>` (`securitySchemes.bearer-key`
 * in every fragment). Webex's OAuth authorize/token endpoints
 * (`/v1/authorize`, `/v1/access_token`) are also on this host, so
 * `network.allow` needs nothing beyond it.
 *
 * ## Errors
 *
 * Every non-2xx response is `{"message": "...", "errors": [{"description":
 * "..."}], "trackingId": "..."}`, confirmed live (an unauthenticated
 * `GET /people/me` returns exactly this shape). `trackingId` is Webex's own
 * support-correlation id and is safe to surface — it identifies the request,
 * not the caller.
 *
 * ## List pagination
 *
 * List endpoints (`GET /rooms`, `/messages`, `/memberships`, `/teams`,
 * `/team/memberships`, `/webhooks`) return `{"items": [...]}` and page via an
 * RFC 5988 `Link` response header (`rel="next"`), not a body cursor. This app
 * exposes the raw `items` array and does not walk `Link` itself — a workflow
 * step corresponds to one HTTP call, and each list action's `max` param caps
 * the single page returned.
 *
 * ## Multi-valued query parameters
 *
 * Webex's own prose is explicit for the ones that say so ("Accepts up to 85
 * person IDs separated by commas" on `List People`'s `id`; "List of roleIds
 * separated by commas" on `roles`) and silent for the rest (`List Messages`'
 * `mentionedPeople`). This client treats every multi-valued query parameter as
 * one comma-joined value throughout, rather than guessing a second wire
 * format for the ones with no documented example.
 */

/** The one and only API origin for this app's surface. */
export const API_BASE = "https://webexapis.com/v1";

/** Webex's OAuth endpoints — same host as the API, so nothing extra to allowlist. */
export const OAUTH_AUTHORIZE_URL = `${API_BASE}/authorize`;
export const OAUTH_TOKEN_URL = `${API_BASE}/access_token`;

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Parse a comma-separated form field into a trimmed, non-empty list. */
export function toList(v: string | undefined): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

interface WebexErrorBody {
  message?: string;
  errors?: Array<{ description?: string }>;
  trackingId?: string;
}

/**
 * Turn Webex's error body into one actionable line, keeping `trackingId` —
 * it's what Webex Developer Support asks for, and it names the request, not
 * the caller.
 */
export function formatWebexError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: WebexErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as WebexErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    const body = raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
    return `Webex ${status} for ${method} ${path}: ${body}`;
  }

  const detail = parsed.errors?.map((e) => e.description).filter(Boolean).join("; ");
  const parts = [
    `Webex ${status} for ${method} ${path}: ${parsed.message}`,
    detail && detail !== parsed.message ? detail : undefined,
    parsed.trackingId ? `trackingId=${parsed.trackingId}` : undefined,
    status === 429
      ? "rate-limited; a Retry-After header names how many seconds to wait"
      : undefined,
  ].filter(Boolean);
  return parts.join(" — ");
}

/**
 * Webhook responses carry live secrets, and are therefore stripped before an
 * Action returns.
 *
 * Webex's own OpenAPI schema documents `secret` — the HMAC key used to verify
 * a webhook payload's signature — as a field on `Create a Webhook`, `Get
 * Webhook Details`, `Update a Webhook` **and** each item of `List Webhooks`'
 * `items` array (verified 2026-09-29: identical field/example across all
 * four). So an ordinary read of a webhook a caller didn't even create can
 * hand back the key that lets anyone forge its callback payloads. A workflow
 * step's result is persisted in the run record and routinely echoed into
 * logs and previews, so returning it would turn a read into a durable
 * credential leak. It is deleted rather than masked — a masked placeholder in
 * a field named `secret` reads like a value, and something downstream will
 * try to use it. The value remains available to whoever set it, since they
 * chose it themselves.
 */
export function stripWebhookSecret<T>(webhook: T): T {
  if (!webhook || typeof webhook !== "object" || Array.isArray(webhook)) return webhook;
  const out = { ...(webhook as Record<string, unknown>) };
  delete out.secret;
  return out as T;
}

/** Thin wrapper over `ctx.fetch`. Never sets Authorization — `sign` does that. */
export class WebexClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.body));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatWebexError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    // DELETE (and a few updates) answer 204 with no body.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
