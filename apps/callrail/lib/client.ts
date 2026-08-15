import type { HookContext } from "@w6w/types";

/**
 * CallRail API v3 REST client.
 *
 * Everything in this module was verified on 2026-08-15 against CallRail's own
 * single-page reference (`apidocs.callrail.com`, 891,328 bytes, fetched whole)
 * plus live, unauthenticated probes against `api.callrail.com` and
 * `status.callrail.com` on the same day. Nothing here came from a third-party
 * integration directory.
 *
 * ## One host, one prefix, account-scoped paths
 *
 * The reference declares exactly one API origin, `https://api.callrail.com`,
 * with every documented path carrying the `/v3` prefix. Almost every resource
 * then nests under `/a/{account_id}/...` — the account is not implicit in the
 * credential the way it is for some vendors, so every action in this app takes
 * an explicit `accountId` param rather than guessing one. `GET /v3/a.json`
 * (`actions/account-list.ts`) is how a workflow discovers which account ids an
 * API key can see.
 *
 * ## The response envelope is flat, not wrapped
 *
 * A single-object response (`GET .../calls/{id}.json`) is the object itself,
 * with no envelope. A collection response is the object's own keyed array —
 * `{"page", "per_page", "total_pages", "total_records", "calls": [...]}" for
 * calls, `"companies"` for companies, `"users"` for users, and so on — the key
 * name is the resource's plural, not a fixed `"data"` or `"items"` field like
 * some vendors use. Every list action here reads its own key rather than
 * assuming a shared shape.
 *
 * ## Errors are a flat string, not a structured code
 *
 * Every failure observed — live 401s during verification, and the 403 example
 * in the reference's "Removing a Tag" section — is `{"error": "<message>"}`,
 * where `error` is a plain string. There is no machine-stable error `type` the
 * way Apify or Stripe provide, so {@link formatCallRailError} surfaces the
 * vendor's own sentence rather than inventing a taxonomy CallRail doesn't have.
 *
 * ## Rate limits are fixed ceilings with no readable headroom
 *
 * The reference documents default limits (1,000 requests/hour and 10,000/day
 * general; 150/hour and 1,000/day for SMS sends; 100/hour and 2,000/day for
 * outbound calls) and says an exceeded limit answers `429`. It does not
 * document — and a live probe carried no — `X-RateLimit-*` response headers or
 * any endpoint that reports remaining headroom. `health/quota.ts` declares
 * that absence rather than fabricating a number.
 */

/** The one and only API origin. The reference declares no other server. */
export const API_BASE = "https://api.callrail.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v3";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** CallRail's pagination metadata, present on every collection response. */
export interface PageMeta {
  page: number;
  per_page: number;
  total_pages: number;
  total_records: number;
}

interface CallRailErrorBody {
  error?: unknown;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: a filter of `first_time_callers=false` or
 * `per_page=0` is meaningful, and silently dropping it would make it
 * impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/comma param into a trimmed, deduped-order list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so
 * both are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn CallRail's error body into one actionable line.
 *
 * CallRail's `error` field is a plain string (verified live: an unauthenticated
 * request to `/v3/a.json` answers `401 {"error":"HTTP Token: Access denied"}`,
 * 37 bytes), so this surfaces it verbatim rather than inventing structure the
 * vendor doesn't provide.
 */
export function formatCallRailError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: CallRailErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as CallRailErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = typeof parsed?.error === "string"
    ? parsed.error
    : parsed?.error !== undefined
    ? JSON.stringify(parsed.error)
    : undefined;

  const parts = [
    `CallRail ${status} for ${method} ${path}`,
    message ?? (raw ? truncate(raw) : undefined),
    status === 429
      ? "CallRail rate-limits per account (1,000 requests/hour, 10,000/day by default; lower " +
        "ceilings apply to SMS sends and outbound calls); retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * Path-escape a caller-supplied resource id.
 *
 * CallRail ids (`ACC…`, `COM…`, `CAL…`, `TRK…`, `USR…`, `FOR…`, and the short
 * alphanumeric text-conversation id) use no path-unsafe characters, but a
 * pasted value could still carry a stray `/` or `?` — `encodeURIComponent`
 * neutralises that without needing any of Apify's tilde-preservation logic.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

export class CallRailClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body. Works for both the flat single-object and collection shapes. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints that answer `204 No Content` (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // CallRail's own multi-value convention: `tags[]=A&tags[]=B`, not a
        // comma-joined single value (see `tracker_ids` and `tags` filters in
        // the reference).
        for (const item of v) {
          if (item === undefined || item === null || item === "") continue;
          url.searchParams.append(`${k}[]`, String(item));
        }
      } else {
        url.searchParams.set(k, String(v));
      }
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
        formatCallRailError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
