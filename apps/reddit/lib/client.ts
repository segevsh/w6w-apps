import type { HookContext } from "@w6w/types";

/**
 * `oauth.reddit.com` is the OAuth-authenticated API host — every endpoint
 * this app calls needs a bearer token, so every action goes through it
 * rather than the unauthenticated `www.reddit.com/*.json` mirror (verified
 * against github.com/reddit-archive/reddit/wiki/API, checked 2026-07-31:
 * "when making requests with OAuth, use oauth.reddit.com as the hostname").
 * `www.reddit.com` is still declared in `w6w.network.allow` (see
 * package.json) because it is Reddit's authorize + token host — those hosts
 * are already allowed implicitly for a `type: "oauth2"` Auth (see
 * build-a-w6w-app.md), so the entry here is a defensive restatement, not a
 * host any action hook calls directly.
 */
export const API_URL = "https://oauth.reddit.com";

/**
 * Reddit's API rejects generic/missing User-Agent strings (and rate-limits
 * default HTTP-client UAs like "Python/urllib" much harder), so every
 * request — not just authenticated ones — must carry a descriptive one in
 * the vendor's documented shape:
 *
 *   <platform>:<app ID>:<version string> (by /u/<reddit username>)
 *
 * per github.com/reddit-archive/reddit/wiki/API#rules (checked 2026-07-31).
 * `w6w-io` below is a PLACEHOLDER, not a verified Reddit account — an
 * operator standing up this app for real traffic should replace it with the
 * Reddit username of the account that owns the registered Reddit app (the
 * `client_id` configured via `PUT /apps/io.w6w.reddit/oauth-config/oauth2`).
 * See README.md "User-Agent" for the full requirement.
 */
export const USER_AGENT = "web:io.w6w.reddit:v0.1.0 (by /u/w6w-io)";

export interface RequestOptions {
  method?: string;
  /** Query-string params (used for every GET, and appended to POST URLs Reddit expects them on). */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Form-encoded body — Reddit's `/api/*` write endpoints expect `application/x-www-form-urlencoded`, not JSON. */
  form?: Record<string, string | number | boolean | undefined | null>;
}

/** Reddit's `[code, message, field]` shape for `json.errors` on write endpoints. */
type RedditApiError = [string, string, string];

interface RedditEnvelope {
  json?: { errors?: RedditApiError[]; data?: unknown };
  message?: string;
  error?: number | string;
}

/** `t3_<id>` (post), `t1_<id>` (comment) — Reddit's "fullname" prefixes. */
export function fullname(prefix: "t1" | "t3", id: string): string {
  return id.startsWith(`${prefix}_`) ? id : `${prefix}_${id}`;
}

function buildQuery(params?: RequestOptions["query"]): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization or User-Agent —
 * both are injected by the auth `sign` hook, which runs for every outbound
 * request this client makes (see `auth/oauth2.ts`).
 */
export class RedditClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = `${API_URL}${path}${buildQuery(options.query)}`;

    const init: RequestInit = { method };
    if (options.form) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        body.set(k, String(v));
      }
      init.headers = { "content-type": "application/x-www-form-urlencoded" };
      init.body = body.toString();
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as unknown) : undefined;

    if (!res.ok) {
      const body = parsed as RedditEnvelope | undefined;
      const detail = body?.message ?? text;
      throw new Error(
        `Reddit API ${res.status} ${res.statusText} for ${method} ${path}: ${detail}`,
      );
    }

    // Reddit's write endpoints (`/api/submit`, `/api/comment`, …) return 200
    // even on a validation failure, with the error inside `json.errors`.
    const envelope = parsed as RedditEnvelope | undefined;
    if (envelope?.json?.errors && envelope.json.errors.length > 0) {
      const detail = envelope.json.errors.map(([, message]) => message).join("; ");
      throw new Error(`Reddit API rejected ${method} ${path}: ${detail}`);
    }

    return parsed as T;
  }
}

/** A single `t3_`/`t1_`/… entry inside a Reddit "Listing" envelope. */
export interface RedditThing<T = Record<string, unknown>> {
  kind: string;
  data: T;
}

/** `{ kind: "Listing", data: { children, after, before } }` — Reddit's paginated envelope. */
export interface RedditListing<T = Record<string, unknown>> {
  kind: "Listing";
  data: {
    children: RedditThing<T>[];
    after: string | null;
    before: string | null;
  };
}

export function listingItems<T = Record<string, unknown>>(listing: RedditListing<T>): T[] {
  return listing.data.children.map((c) => c.data);
}
