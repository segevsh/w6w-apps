import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Mastodon — verified live against `mastodon.social` (v4.7.0-rc.1) on
 * 2026-08-18.
 *
 * ## Every server is a different API
 *
 * This is the property everything else follows from. Mastodon is software
 * thousands of people run, and a "Mastodon connection" is a connection to *one
 * instance*. They share a shape and differ in almost every detail that matters
 * to a workflow:
 *
 * - **The character limit is per instance.** 500 is the default and a great
 *   many servers raise it. `/api/v2/instance` reports
 *   `configuration.statuses.max_characters`, and this app reads it rather than
 *   assuming — a post rejected for length on one server posts fine on another.
 * - **So is the media limit**, the poll option count, and the accepted MIME
 *   types.
 * - **So is the version.** An endpoint added in 4.3 simply 404s on a server
 *   still on 4.1, and the error says nothing about versions.
 * - **So are the rules.** Automated posting is welcome on some instances and
 *   grounds for suspension on others. That is a policy question this app cannot
 *   answer, and it is worth answering before pointing a workflow at somebody
 *   else's server.
 *
 * ## There is no central OAuth client, and there cannot be
 *
 * OAuth on Mastodon requires registering an application **on each instance**
 * (`POST /api/v1/apps`, which works unauthenticated — verified live), producing
 * a `client_id` that is valid on that server alone. A single OAuth
 * configuration therefore cannot exist, which is why this app takes a personal
 * access token instead: Preferences → Development → New application, and copy
 * the token it issues.
 *
 * ## Paging is in Link headers, not the body
 *
 * Responses carry `Link: <…>; rel="next", <…>; rel="prev"`, and the body is a
 * bare array with no cursor in it. `parseLink` below reads them.
 *
 * The three id parameters are **not interchangeable**, and this is the trap:
 *
 * - `max_id` — older than this. Ordinary backward paging.
 * - `since_id` — newer than this, returning the **newest** ones and skipping
 *   the middle if more arrived than the limit.
 * - `min_id` — newer than this, returning the **oldest** ones, so repeated
 *   calls walk forward without gaps.
 *
 * For "everything since last run", `min_id` is right and `since_id` silently
 * loses posts.
 */

/** Public (redacted-safe) connection metadata. */
export interface MastodonConnectionDisplay {
  url?: string;
  acct?: string;
  maxCharacters?: number;
  maxMedia?: number;
  version?: string;
}

/** Normalise a user-typed instance URL into an origin. */
export function normalizeUrl(raw: unknown): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("a Mastodon instance URL is required");
  // People paste `@user@instance.social` as often as a URL.
  const handle = /^@?[^@\s]+@([a-z0-9.-]+\.[a-z]{2,})$/i.exec(trimmed);
  const candidate = handle ? `https://${handle[1]}` : trimmed;
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`the instance URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`the instance URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`;
}

/** Read the instance origin off the redacted Connection. */
export function urlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as MastodonConnectionDisplay;
  const url = String(display.url ?? "").trim();
  if (!url) {
    throw new Error(
      "this connection has no instance URL recorded — reconnect it so the app knows which " +
        "server to reach",
    );
  }
  return normalizeUrl(url);
}

/**
 * The instance's own character limit, from the connection.
 *
 * 500 is Mastodon's default and the fallback here, but a great many servers
 * raise it — so the recorded value wins wherever there is one.
 */
export const DEFAULT_MAX_CHARACTERS = 500;

export function maxCharactersFor(connection: RedactedConnection | undefined): number {
  const display = (connection?.display ?? {}) as MastodonConnectionDisplay;
  const recorded = Number(display.maxCharacters ?? NaN);
  return Number.isFinite(recorded) && recorded > 0 ? recorded : DEFAULT_MAX_CHARACTERS;
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

/**
 * Pull the paging ids out of a `Link` header.
 *
 * The body is a bare array with no cursor in it, so this is the only place
 * paging state exists. Returns the `max_id` and `min_id` embedded in the
 * `next`/`prev` URLs, which is more useful than the URLs themselves — a caller
 * passes them back as parameters.
 */
export function parseLink(header: string | null): { maxId?: string; minId?: string } {
  if (!header) return {};
  const out: { maxId?: string; minId?: string } = {};
  for (const part of header.split(",")) {
    const match = /<([^>]+)>;\s*rel="(next|prev)"/.exec(part.trim());
    if (!match) continue;
    let url: URL;
    try {
      url = new URL(match[1]);
    } catch {
      continue;
    }
    if (match[2] === "next") out.maxId = url.searchParams.get("max_id") ?? undefined;
    if (match[2] === "prev") out.minId = url.searchParams.get("min_id") ?? undefined;
  }
  return out;
}

/**
 * Mastodon's status text is **HTML**, not plain text.
 *
 * `content` arrives as `<p>hello <a href="…">#tag</a></p>`. A workflow matching
 * on it, or writing it into a message somewhere else, gets markup. This strips
 * it to something readable while leaving the original intact.
 */
export function stripHtml(html: unknown): string {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Turn a Mastodon error into something actionable. */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { error?: string; error_description?: string };
    detail = body?.error_description ?? body?.error ?? detail;
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail} — the access token was rejected. Tokens are issued by ONE instance and are ` +
      "meaningless on any other, so a token that worked before a URL change will not work after it";
  }
  if (status === 403) {
    return `${detail} — the token is valid but lacks the scope. Mastodon scopes are chosen when ` +
      "the application is created and cannot be widened afterwards; a new application is the only way";
  }
  if (status === 404) {
    return `${detail} — not found. On a federated network this also happens when the instance ` +
      "has simply never seen the account or post you named: a remote object exists only once " +
      "somebody here has looked it up";
  }
  if (status === 422) {
    return `${detail} — the instance refused the content. Length limits, media counts and poll ` +
      "options are all per-instance, so this may be valid elsewhere";
  }
  if (status === 429) {
    return `${detail} — rate limited by this instance. Limits are per instance and per token, ` +
      "and small servers set them far lower than mastodon.social";
  }
  if (status === 503) {
    return `${detail} — the instance is unavailable. On a federated network this is one server, ` +
      "not the network";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** `POST /api/v1/statuses` deduplicates on this. */
  idempotencyKey?: string;
  form?: FormData;
}

/** A response together with the paging state from its `Link` header. */
export interface Paged<T> {
  items: T;
  maxId?: string;
  minId?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class MastodonClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = urlFromConnection(ctx.connection);
  }

  /** The instance's own character limit, or Mastodon's default. */
  get maxCharacters(): number {
    return maxCharactersFor(this.ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.paged<T>(path, options)).items;
  }

  /** The same, keeping the `Link` header's paging ids. */
  async paged<T = unknown>(path: string, options: RequestOptions = {}): Promise<Paged<T>> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    // Mastodon deduplicates posts on this for a few minutes, which is what
    // makes a retried `status-post` safe.
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form) {
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Mastodon ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }

    const link = parseLink(res.headers.get("link"));
    if (res.status === 204 || !text) return { items: undefined as T, ...link };
    try {
      return { items: JSON.parse(text) as T, ...link };
    } catch {
      throw new Error(`Mastodon did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/**
 * A stable idempotency key derived from the post's own content.
 *
 * Mastodon deduplicates on `Idempotency-Key`, and like every such mechanism it
 * only helps if the value is identical across attempts — a freshly generated
 * one is carried by the retry and both posts appear. Hashing the content gives
 * exactly the property a retry needs.
 */
export async function deriveIdempotencyKey(payload: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
