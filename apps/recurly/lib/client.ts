/**
 * Recurly V3 API — verified against the vendor's own sources on 2026-09-15:
 *
 *   - the official OpenAPI 3.0 document shipped inside the Node SDK repo,
 *     <https://github.com/recurly/recurly-client-node/blob/v3-v2021-02-25/openapi/api.yaml>
 *     (`info.version: v2021-02-25`, the branch the repo's `default_branch` names)
 *     — the same document Recurly renders at
 *     <https://recurly.com/developers/api/v2021-02-25/index.html>;
 *   - the "Getting Started" prose embedded in that document's `info.description`,
 *     which is the authoritative source for everything not expressible in a path
 *     or schema (the version header, pagination, rate limits, idempotency).
 *
 * Four things about this API are easy to get wrong, because getting them wrong
 * produces a working-looking request that 400s, or a 200 that quietly means
 * something else.
 *
 * ## 1. Every request must declare an API version — there is no "latest"
 *
 * Recurly's dated-version scheme puts the version in the `Accept` header, not
 * the URL: `Accept: application/vnd.recurly.v2021-02-25+json`. The docs are
 * explicit that omitting it is a hard failure, not a fallback to some default —
 * *"Specifying a version is required to get a successful response."* This app
 * pins `v2021-02-25`, Recurly's current GA version per its own version table.
 *
 * ## 2. The host encodes DATA RESIDENCY, not environment
 *
 * There is no sandbox/production split in the host name (unlike Chargebee's
 * `{site}-test` convention) — a Recurly *site* carries its own mode, and both
 * modes live on the same host. The only host-level split is EU data residency:
 * `v3.recurly.com` (global) vs `v3.eu.recurly.com` (EU sites only), each with
 * its own API keys per the OpenAPI document's two `servers` entries. Sending an
 * EU site's key to the global host (or vice versa) fails authentication in a
 * way that looks identical to a bad key.
 *
 * ## 3. IDs, codes and UUIDs share one path slot, disambiguated by PREFIX
 *
 * Every resource can be looked up by its Recurly-assigned ID with no prefix, or
 * by its own human-assigned identifier with a prefix that names which kind it
 * is — `code-` (accounts, plans, coupons), `uuid-` (subscriptions,
 * transactions), or `number-` (invoices). The OpenAPI document states this
 * per-parameter, e.g. the `account_id` path parameter: *"For ID no prefix is
 * used e.g. `e28zov4fw0v2`. For code use prefix `code-`, e.g. `code-bob`."*
 * Passing a bare code with no prefix does not error clearly — Recurly reads it
 * as a (wrong) numeric-style ID and answers a plain 404, which looks identical
 * to "no such account" and gives no hint that a prefix was expected. This app
 * passes whatever string a caller supplies straight through, unprefixed —
 * adding the prefix here would be guessing which kind of identifier a caller
 * meant, which only the caller knows.
 *
 * ## 4. Money is a plain decimal number in the currency's MAJOR unit
 *
 * `UnitAmount` (plan pricing, subscription overrides) and every invoice/
 * transaction amount are typed `number, format: float` — `10.00` for ten
 * dollars, not `1000` cents. This is a real point of variance across this
 * pack's payment apps: Chargebee is an integer in the smallest unit, Mollie
 * sends an exact decimal *string*. Recurly is neither — a plain JSON float in
 * major units — and nothing in this app converts it.
 */
import type { HookContext, OutputField, Param } from "@w6w/types";

/** Pinned API version — see module doc §1. Required on every request. */
export const API_VERSION = "v2021-02-25";
export const ACCEPT_HEADER = `application/vnd.recurly.${API_VERSION}+json`;

export type RecurlyRegion = "us" | "eu";

/** The two data-residency hosts the OpenAPI document declares as `servers`. */
export const HOSTS: Record<RecurlyRegion, string> = {
  us: "v3.recurly.com",
  eu: "v3.eu.recurly.com",
};

/** Public (redacted-safe) connection metadata published by `auth/api-key.ts#afterConnect`. */
export interface RecurlyConnectionDisplay {
  region?: RecurlyRegion;
  subdomain?: string;
}

export function hostFor(display: RecurlyConnectionDisplay | undefined): string {
  return HOSTS[display?.region ?? "us"];
}

/**
 * Recurly's error envelope, stated in the OpenAPI `Error` schema: `type`
 * (a closed enum including `invalid_api_key`, `not_found`, `validation`,
 * `unauthorized`, …), `message`, and optional `params`.
 *
 * Classifying a failure by this `type` field — not by the bare HTTP status —
 * is what tells "wrong site/host" apart from "wrong key" apart from "no such
 * record", all of which a plain 401/404 can otherwise blur together.
 */
export interface RecurlyError {
  type?: string;
  message?: string;
  params?: Array<{ param?: string }>;
}

export interface RecurlyListEnvelope<T = unknown> {
  object?: string;
  has_more?: boolean;
  /** Opaque path to the next page — see `request`'s `path` parameter for how it is followed. */
  next?: string | null;
  data?: T[];
}

export interface RequestOptions {
  method?: string;
  /**
   * Query parameters. `undefined`/`null`/`""` are dropped; arrays are joined
   * with commas, matching the `ids` parameter's documented wire form
   * (`ids=h1,h2,h3`).
   */
  query?: Record<string, string | number | boolean | readonly string[] | undefined | null>;
  /** JSON request body. Recurly's write endpoints take `application/json`, never form-encoding. */
  json?: unknown;
}

function buildQuery(query: RequestOptions["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      const joined = value.filter((v) => v !== undefined && v !== null && v !== "").join(",");
      if (joined) params.set(key, joined);
      continue;
    }
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Percent-encode a single path segment (an ID, a `code-`/`uuid-`/`number-` value). */
export function pathId(id: string): string {
  return encodeURIComponent(String(id ?? ""));
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets an `Authorization` header itself —
 * the runtime routes every request through the Auth `sign` hook, the only code
 * handed the raw credential.
 */
export class RecurlyClient {
  constructor(private ctx: HookContext, private host: string) {}

  static fromConnection(ctx: HookContext): RecurlyClient {
    const display = (ctx.connection?.display ?? {}) as RecurlyConnectionDisplay;
    return new RecurlyClient(ctx, hostFor(display));
  }

  /**
   * `path` may be a bare resource path (`/accounts`) that this method appends
   * `options.query` to, OR a full opaque path a previous list response
   * returned in `next` (already carrying its own query string, per the
   * OpenAPI `AccountList.next` doc: "Path to subsequent page of results").
   * `options.query` is ignored when `path` already has a `?` in it, so a
   * caller can pass a `next` value straight through without stripping it.
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const hasQuery = path.includes("?");
    const url = `https://${this.host}${path}${hasQuery ? "" : buildQuery(options.query)}`;

    const method = (options.method ?? (options.json !== undefined ? "POST" : "GET")).toUpperCase();
    const headers: Record<string, string> = { accept: ACCEPT_HEADER };
    const init: RequestInit = { method, headers };

    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();

    if (!res.ok) {
      let parsed: RecurlyError | undefined;
      try {
        parsed = text ? JSON.parse(text) as RecurlyError : undefined;
      } catch {
        // Non-JSON body (a proxy page, an empty 502) — fall through to the status.
      }
      const detail = parsed?.message ?? (text ? text.slice(0, 300) : res.statusText);
      throw new Error(
        `Recurly ${res.status}${
          parsed?.type ? ` (${parsed.type})` : ""
        } for ${method} ${path}: ${detail}`,
      );
    }

    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Recurly returned a non-JSON body for ${method} ${path}: ${text.slice(0, 200)}`,
      );
    }
  }
}

/**
 * Read Recurly's documented rate-limit headers off any response. Present on
 * every response per the "Limits" section of the OpenAPI description:
 * `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (Unix
 * epoch seconds).
 */
export function rateLimitFromHeaders(
  headers: Headers,
): { limit?: number; remaining?: number; resetAt?: string } {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  const out: { limit?: number; remaining?: number; resetAt?: string } = {};
  if (limit !== null && limit !== "") out.limit = Number(limit);
  if (remaining !== null && remaining !== "") out.remaining = Number(remaining);
  if (reset !== null && reset !== "") {
    const seconds = Number(reset);
    if (Number.isFinite(seconds)) out.resetAt = new Date(seconds * 1000).toISOString();
  }
  return out;
}

/** The `Param[]` fragment every list action reuses. */
export const PAGE_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint: "Records per page. Recurly defaults to 20 and caps this at 200.",
    validation: { min: 1, max: 200, integer: true },
  },
  {
    key: "order",
    label: "Sort order",
    type: "select" as const,
    options: [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending" },
    ],
    hint: "Applies to whichever date field `sort` names.",
  },
  {
    key: "ids",
    label: "IDs",
    type: "string" as const,
    hint: "Comma-separated list of up to 200 IDs. Cannot be combined with any other filter here " +
      "— Recurly's own rule, not this app's.",
  },
  {
    key: "next",
    label: "Next page",
    type: "string" as const,
    hint: "Opaque `next` value from a previous page of this same list. When set, every other " +
      "param on this action is ignored — Recurly documents `next` as a self-contained path to " +
      "the next page, not a token to combine with fresh filters.",
  },
];

/** The `output` fragment every list action reuses — Recurly's list envelope, unchanged. */
export const PAGE_OUTPUT: OutputField[] = [
  { key: "object", type: "string" as const, label: 'Object type (always "list")' },
  { key: "has_more", type: "boolean" as const, label: "Whether another page exists" },
  { key: "next", type: "string" as const, label: "Opaque path to the next page, if any" },
  { key: "data", type: "array" as const, label: "Results for this page" },
];
