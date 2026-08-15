import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Mail REST API client.
 *
 * Every path, query parameter, body field and response shape here was
 * verified on 2026-08-15 against Zoho's own documentation
 * (`https://www.zoho.com/mail/help/api/`, 95,001 bytes — the index — plus the
 * per-endpoint pages it links to) and live probes against `mail.zoho.com` and
 * its seven regional siblings (see `lib/regions.ts`).
 *
 * ## No version prefix, unlike Zoho CRM
 *
 * This pack's `zoho` (Zoho CRM) app targets `/crm/v6/...`. Zoho Mail has no
 * version segment at all — every documented path is `/api/...` directly. That
 * difference is easy to assume away when a second Zoho app is built from the
 * first one, so it is stated here rather than left implicit.
 *
 * ## The envelope, and the endpoints that break it
 *
 * A successful response is `{"status": {"code", "description"}, "data": ...}`.
 * `data` is sometimes an object, sometimes an array — and on the
 * `updatemessage` / `updatethread` family (mark read, move, apply label, ...)
 * it is **absent entirely**: the response is just `{"status": {"code":200,
 * "description":"success"}}`. Treating a missing `data` as an error would
 * fail every one of those calls, so {@link ZohoMailClient.request} returns
 * `undefined` rather than throwing when the envelope carries no `data`.
 *
 * ## The error shape is NOT the CRM app's
 *
 * Zoho CRM's error body is flat: `{"code", "message", "status"}`. Zoho Mail's
 * is nested under `data`: `{"data": {"errorCode", "moreInfo"?}, "status":
 * {"code", "description"}}` — confirmed live: an unauthenticated
 * `GET /api/accounts` answers `400 {"data":{"errorCode":"INVALID_TICKET",
 * "moreInfo":"Invalid ticket"},"status":{"code":400,"description":"Invalid
 * Input"}}`, and a syntactically-shaped but invalid bearer answers
 * `401 {"data":{"errorCode":"INVALID_OAUTHTOKEN"},"status":{"code":401,
 * "description":"Invalid Access"}}`. Two Zoho products, two different error
 * envelopes under the same `Zoho-oauthtoken` auth scheme — worth knowing
 * before assuming one Zoho client shape fits every Zoho app.
 */

/** Every documented endpoint hangs directly off `/api` — there is no version segment. */
export const API_PREFIX = "/api";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s
 * `afterConnect` (one fixed host per region-specific auth method — see
 * `lib/regions.ts` for why there is no single `oauth2` method with a
 * data-centre field). Falls back to the US host only for a Connection that
 * predates `afterConnect` recording it, which should not happen in practice.
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

/**
 * The mailbox account id this call should act on.
 *
 * Every documented Zoho Mail endpoint is scoped under `/api/accounts/
 * {accountId}` — the id of one of the *authenticated user's own* mailbox
 * accounts (an admin or a delegated user can have more than one). Rather than
 * force `accountId` as a required param on every single Action, it is
 * optional and falls back to the primary account id `afterConnect` records on
 * the Connection (see `auth/oauth2.ts`) — the common case needs nothing typed
 * in. `account-list` surfaces every id available when a caller genuinely has
 * more than one mailbox to choose from.
 */
export function accountIdFrom(
  input: { accountId?: string | number },
  ctx: HookContext,
): string {
  const fromInput = input.accountId;
  if (fromInput !== undefined && fromInput !== null && String(fromInput).trim() !== "") {
    return String(fromInput).trim();
  }
  const display = (ctx.connection?.display ?? {}) as { accountId?: string };
  if (display.accountId) return display.accountId;
  throw new Error(
    "No `accountId` was provided and none is recorded on this connection. Run Get Accounts and " +
      "pass one explicitly.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

interface ZohoMailStatus {
  code?: number;
  description?: string;
}

interface ZohoMailEnvelope<T> {
  status?: ZohoMailStatus;
  data?: T;
}

interface ZohoMailErrorBody {
  data?: { errorCode?: string; moreInfo?: string };
  status?: ZohoMailStatus;
}

/**
 * Turn a Zoho Mail error response into one actionable line.
 *
 * `errorCode` is the stable machine token (`INVALID_TICKET`,
 * `INVALID_OAUTHTOKEN`, `URL_RULE_MISMATCH`, ...) documented as the
 * troubleshooting key; `moreInfo` is the vendor's own free-text elaboration
 * when it bothers to send one (`INVALID_OAUTHTOKEN` does not).
 */
export function formatZohoMailError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ZohoMailErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ZohoMailErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const errorCode = parsed?.data?.errorCode;
  const moreInfo = parsed?.data?.moreInfo;
  const description = parsed?.status?.description;
  if (!errorCode && !description) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Mail ${status} for ${method} ${path}: ${trimmed}`;
  }
  return [
    `Zoho Mail ${status}${errorCode ? ` ${errorCode}` : ""} for ${method} ${path}`,
    moreInfo,
    !moreInfo ? description : undefined,
  ].filter(Boolean).join(": ");
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoMailClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  /**
   * `undefined` when the envelope carried no `data` — the shape
   * `updatemessage`/`updatethread` answer with on success. See the module
   * doc comment for why that is not an error.
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
    const url = new URL(`https://${this.host}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatZohoMailError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined;
    const envelope = JSON.parse(text) as ZohoMailEnvelope<T>;
    return envelope.data;
  }
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Parse a `messageId`/`threadId` list param into the JSON array of longs the
 * `updatemessage`/`updatethread` endpoints require. Accepts either a real
 * array (already-resolved workflow value) or a comma-separated string (what a
 * user types into a plain text field).
 */
export function toIdArray(v: unknown): (string | number)[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = Array.isArray(v) ? v : String(v).split(",");
  const out = items.map((s) => String(s).trim()).filter(Boolean);
  return out.length ? out : undefined;
}
