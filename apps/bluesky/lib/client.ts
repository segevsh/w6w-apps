import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * The AT Protocol, as Bluesky serves it — verified against the **lexicons**
 * (`github.com/bluesky-social/atproto`, `lexicons/**`, fetched 2026-08-18),
 * which are the normative machine-readable schemas rather than prose docs, and
 * probed live against `bsky.social` and `public.api.bsky.app` the same day.
 *
 * Four things here work unlike any other app in this pack.
 *
 * ## 1. There are two hosts, and they answer different questions
 *
 * A **PDS** (`bsky.social`, or your own) holds your repository: it is where you
 * authenticate and where writes go. An **AppView**
 * (`public.api.bsky.app`) holds the aggregated view of the network: profiles,
 * feeds, threads, follower lists — things assembled from everyone's repos.
 *
 * Confusingly, `bsky.social` proxies AppView reads for an authenticated user,
 * so a signed request can do everything through one host. Unauthenticated reads
 * must go to the public AppView, and **not all of them are public**: probed
 * live, `app.bsky.actor.getProfile` and `getAuthorFeed` answer without a token,
 * while `app.bsky.feed.searchPosts` returns a **403 HTML page from an edge
 * proxy** — not a JSON error, not a 401. So this app routes everything through
 * the authenticated PDS, and the client refuses a non-JSON body loudly rather
 * than parsing an error page.
 *
 * ## 2. Creating a session is severely rate-limited; refreshing is not
 *
 * Measured on a failed `createSession` against `bsky.social`:
 *
 *     ratelimit-limit: 10
 *     ratelimit-policy: 10;w=86400
 *
 * **Ten per day.** A workflow that logs in per run stops working before lunch.
 * The session model is therefore not an optimisation, it is the only way this
 * works: `createSession` once at connect time, then `refreshSession` forever.
 * See `auth/app-password.ts`.
 *
 * ## 3. A handle is a rented name; the DID is the account
 *
 * `@alice.example.com` is a DNS-backed handle that can be changed, lost with a
 * domain, or taken by someone else. `did:plc:z72i7hdynmk6r22z27h6tvur` is the
 * account, permanently. Anything stored for longer than a workflow run should
 * store the DID, and the actions return both.
 *
 * ## 4. Rich text is not parsed for you
 *
 * See `lib/richtext.ts`. This is the one that silently produces wrong output.
 */

/** Bluesky's own PDS, and the default for a new connection. */
export const DEFAULT_SERVICE = "https://bsky.social";

/** The public AppView, for reads that do not need a session. */
export const PUBLIC_APPVIEW = "https://public.api.bsky.app";

/** Public (redacted-safe) connection metadata. */
export interface BlueskyConnectionDisplay {
  service?: string;
  handle?: string;
  did?: string;
}

/** Normalise a user-typed PDS URL into an origin. */
export function normalizeService(raw: unknown): string {
  const trimmed = String(raw ?? "").trim() || DEFAULT_SERVICE;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`the PDS URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`the PDS URL has no host: ${trimmed}`);
  return url.port
    ? `${url.protocol}//${url.hostname}:${url.port}`
    : `${url.protocol}//${url.hostname}`;
}

/** Read the PDS origin off the redacted Connection. */
export function serviceFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as BlueskyConnectionDisplay;
  return normalizeService(display.service ?? DEFAULT_SERVICE);
}

/** The account's own DID, recorded on the connection at connect time. */
export function didFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as BlueskyConnectionDisplay;
  const did = String(display.did ?? "").trim();
  if (!did) {
    throw new Error(
      "this connection has no DID recorded — reconnect it, so the app knows which repository " +
        "to write to",
    );
  }
  return did;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** Coerce loosely-typed action params into query-string values, dropping empties. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
}

/** Drop keys the caller left unset, so a default is not overwritten with nothing. */
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

/** A parsed `at://did/collection/rkey`. */
export interface AtUriParts {
  did: string;
  collection: string;
  rkey: string;
}

/**
 * Parse an AT-URI.
 *
 * Every record in the network is addressed as
 * `at://did:plc:abc.../app.bsky.feed.post/3k2a...`, and the three parts matter
 * separately: `deleteRecord` takes `repo`, `collection` and `rkey`, not the URI.
 */
export function parseAtUri(value: unknown, field: string): AtUriParts {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`\`${field}\` is required`);
  const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(text);
  if (!match) {
    throw new Error(
      `\`${field}\` must be an AT-URI like ` +
        "`at://did:plc:abc123/app.bsky.feed.post/3k2a4x5y6z7` — that is the value the actions " +
        "return as `uri`, not the bsky.app web link",
    );
  }
  return { did: match[1], collection: match[2], rkey: match[3] };
}

/**
 * Turn a `bsky.app` web link into the AT-URI it refers to, where that is
 * possible without a lookup.
 *
 * `https://bsky.app/profile/{handleOrDid}/post/{rkey}` maps to
 * `at://{handleOrDid}/app.bsky.feed.post/{rkey}` — and the handle form still
 * resolves, because the APIs accept a handle wherever they accept a DID. It is
 * offered because pasting a link from the browser is what people actually have,
 * and the alternative is a confusing error about AT-URIs.
 */
export function webLinkToAtUri(text: string): string | undefined {
  const match = /^https?:\/\/(?:[a-z0-9-]+\.)*bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/i.exec(
    text.trim(),
  );
  if (!match) return undefined;
  return `at://${match[1]}/app.bsky.feed.post/${match[2]}`;
}

/** Accept either an AT-URI or a bsky.app link wherever a post is named. */
export function postUri(value: unknown, field: string): AtUriParts & { uri: string } {
  const text = String(value ?? "").trim();
  const converted = webLinkToAtUri(text) ?? text;
  return { ...parseAtUri(converted, field), uri: converted };
}

/**
 * Turn an XRPC error into something actionable.
 *
 * Errors are `{"error": "NameOfError", "message": "prose"}`. The `error` name is
 * the part worth branching on, and it is what the messages below key off.
 */
export function describeXrpc(status: number, text: string): string {
  let body: { error?: string; message?: string } | null = null;
  try {
    body = JSON.parse(text) as { error?: string; message?: string };
  } catch { /* not JSON — see below */ }

  if (!body) {
    // A 403 from `searchPosts` without a token is an HTML page from an edge
    // proxy, not an XRPC error. Saying so beats "unexpected token < in JSON".
    return `${status} with a non-JSON body — this is usually an edge proxy rather than the ` +
      `PDS itself: ${text.slice(0, 160)}`;
  }

  const name = body.error ?? "";
  const detail = body.message ?? "";
  const base = detail ? `${name}: ${detail}` : name || `HTTP ${status}`;

  if (name === "ExpiredToken" || name === "InvalidToken") {
    return `${base} — the access token has expired. The host refreshes it automatically; if this ` +
      "keeps happening the refresh token is also gone and the connection needs reconnecting";
  }
  if (name === "AuthenticationRequired") {
    return `${base} — the identifier or app password was rejected. Note that this must be an APP ` +
      "PASSWORD from Settings → Privacy and security → App passwords, not the account password";
  }
  if (name === "AccountTakedown") {
    return `${base} — the account has been taken down by the PDS operator`;
  }
  if (name === "RateLimitExceeded" || status === 429) {
    return `${base} — rate limited. Note that createSession is limited to roughly ten per day, ` +
      "so a workflow that re-authenticates instead of refreshing will hit this and stay stuck";
  }
  if (name === "InvalidRequest" && /record.*not.*found/i.test(detail)) {
    return `${base} — the record does not exist. Deleting a like or repost needs the URI of the ` +
      "LIKE record, not of the post it points at";
  }
  return base;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Override the host — used only by the unauthenticated health probes. */
  service?: string;
  /** Raw bytes, for `uploadBlob`. */
  raw?: { bytes: Uint8Array; contentType: string };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class BlueskyClient {
  readonly service: string;

  constructor(private ctx: HookContext) {
    this.service = serviceFromConnection(ctx.connection);
  }

  /** The account's own DID, for writes to its repository. */
  get did(): string {
    return didFromConnection(this.ctx.connection);
  }

  async call<T = unknown>(nsid: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${options.service ?? this.service}/xrpc/${nsid}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.raw) {
      headers["content-type"] = options.raw.contentType;
      init.body = options.raw.bytes as unknown as BodyInit;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`Bluesky ${nsid}: ${describeXrpc(res.status, text)}`);
    if (res.status === 204 || !text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Bluesky ${nsid} did not return JSON: ${text.slice(0, 160)}`);
    }
  }

  /** `com.atproto.repo.createRecord` against the connection's own repository. */
  createRecord<T = { uri: string; cid: string }>(
    collection: string,
    record: Record<string, unknown>,
  ): Promise<T> {
    return this.call<T>("com.atproto.repo.createRecord", {
      method: "POST",
      body: { repo: this.did, collection, record },
    });
  }

  /** `com.atproto.repo.deleteRecord` — by repo, collection and rkey, not by URI. */
  deleteRecord(collection: string, rkey: string): Promise<unknown> {
    return this.call("com.atproto.repo.deleteRecord", {
      method: "POST",
      body: { repo: this.did, collection, rkey },
    });
  }
}

/** An ISO timestamp the way the lexicons want it. */
export function nowIso(): string {
  return new Date().toISOString();
}
