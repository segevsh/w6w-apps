import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Discourse REST client.
 *
 * ## There is no vendor host — the instance IS the host
 *
 * Discourse is open source and installed per community. A forum lives at
 * whatever domain its owner chose: `meta.discourse.org`, `forum.example.com`,
 * a `*.discourse.group` trial, or a box in someone's basement. Discourse's own
 * OpenAPI document says as much — its single `servers` entry is
 * `https://{defaultHost}` with the placeholder default `discourse.example.com`,
 * i.e. "you tell us".
 *
 * Two consequences, both deliberate:
 *
 *   - the manifest declares `network.allow: ["*"]`, exactly as the sibling
 *     `wordpress` app does and for exactly the same reason: the reachable host
 *     set is the customer's own domain and cannot be enumerated in advance.
 *     Narrowing it to `*.discourse.org` / `*.discourse.group` would break every
 *     self-hosted install, which is most of them.
 *   - the site URL is an **Auth field**, not an Action param. It identifies the
 *     forum the credential belongs to, so it belongs to the Connection.
 *     `afterConnect` republishes it on `connection.display.siteUrl`, and this
 *     module reads it from there — so the client can address the right host
 *     without ever seeing a credential.
 *
 * ## `.json` is part of the path, not a content negotiation
 *
 * Discourse serves the same routes as HTML and as JSON, and the API docs open
 * by explaining the split: "the URL `/categories` serves a list of categories,
 * the `/categories.json` API provides the same information in JSON format".
 * Every path in this app therefore carries the `.json` suffix that Discourse's
 * own reference uses. `accept: application/json` is sent as well — Discourse
 * asks for it when following pagination URLs returned in a response body, which
 * come back *without* the suffix.
 *
 * ## What this client does NOT do
 *
 * It never sets an auth header. `Api-Key` and `Api-Username` are stamped by
 * `auth/api-key.ts`'s `sign` hook, which is the only place the credential is
 * visible. Actions call `ctx.fetch` exclusively through here.
 */

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface DiscourseConnectionDisplay {
  /** Origin of the forum, normalised, no trailing slash — e.g. `https://forum.example.com`. */
  siteUrl?: string;
}

/**
 * Normalise a user-typed site URL into a bare origin.
 *
 * People paste all of `example.com`, `https://example.com/`, and
 * `https://example.com/latest`. All three mean the same forum. A missing scheme
 * defaults to `https` — Discourse requires TLS for API keys in any realistic
 * deployment, and silently producing an `http://` base from a bare hostname
 * would downgrade the credential's transport.
 */
export function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Discourse site URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Discourse site URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Discourse site URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the forum origin off the redacted Connection. Never touches the credential. */
export function siteUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as DiscourseConnectionDisplay;
  if (display.siteUrl) return normalizeSiteUrl(display.siteUrl);
  throw new Error(
    "Discourse connection records no site URL — reconnect the forum so it can be stored.",
  );
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

/**
 * Drop keys the caller left unset.
 *
 * `undefined` and `null` both mean "not supplied" here, unlike some vendors
 * where `null` clears a field: Discourse's update endpoints ignore absent keys
 * and have no documented null-clears-it semantics, so forwarding a `null` would
 * only risk a 422 on a field the user never touched.
 */
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

/**
 * Normalise a comma-separated form field back into the comma-separated string
 * Discourse wants, dropping blanks and stray whitespace.
 *
 * Several Discourse endpoints take a literal CSV **string** rather than a JSON
 * array — `usernames` on the group-membership routes ("comma separated list",
 * example `username1,username2`) and `target_recipients` on private messages
 * ("Required for private message, comma separated", example `blake,sam`). This
 * is the one place that shape is built, so no action hand-rolls a `.join(",")`
 * that forgets to trim.
 */
export function csvString(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/** Split a comma-separated form field into a JSON array, for the endpoints that want one. */
export function csvList(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Discourse's boolean convention, stated in its own API docs: "If an endpoint
 * accepts a boolean be sure to specify it as a lowercase `true` or `false`
 * value unless noted otherwise."
 *
 * `PUT /t/{id}/status.json` is one of the endpoints that *is* noted otherwise —
 * its `enabled` field is typed `string` with `enum: ["true", "false"]`. This
 * helper exists so that endpoint can say what it means instead of relying on
 * `JSON.stringify` coincidentally producing the right token.
 */
export function boolString(v: boolean): "true" | "false" {
  return v ? "true" : "false";
}

export class DiscourseClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = siteUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
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
    if (!res.ok) {
      // Discourse's error envelope is `{ errors: [...], error_type: "..." }`;
      // a 429 additionally carries `extras.wait_seconds`. The body is where the
      // actionable half lives, so it is surfaced verbatim. It contains no
      // credential material — the credential never enters this module.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Discourse ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
