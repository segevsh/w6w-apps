/**
 * Gravity Forms REST API v2 — verified against the vendor's own docs at
 * `https://docs.gravityforms.com/rest-api-v2/` and the per-endpoint pages
 * linked from it (fetched 2026-08-03).
 *
 * ## There is no vendor host
 *
 * Gravity Forms is a **WordPress plugin**, not a SaaS. It registers itself as a
 * namespace on the site's own WordPress REST API, so the base URL is
 * per-customer and looks like:
 *
 *   `https://{their-site}/wp-json/gf/v2`
 *
 * Subdirectory WordPress installs are common and shift the whole route:
 *
 *   `https://site.com/blog/wp-json/gf/v2`
 *
 * which is why the site URL is collected once as an Auth field, echoed onto the
 * Connection's redacted display data by `afterConnect`, and turned into a base
 * URL here rather than in each action. Actions never see the credential — only
 * that display value.
 *
 * Because the host belongs to the customer and cannot be enumerated at publish
 * time, the App manifest declares `network.allow: ["*"]` — the same posture the
 * `wordpress` and `ghost` apps in this pack take, and the one the spec names for
 * "the endpoint is a user-supplied URL (a self-hosted install)".
 *
 * ## Query encoding
 *
 * Gravity Forms reads its list parameters as PHP arrays, so they go on the wire
 * in bracket form (`paging[page_size]=20`, `sorting[key]=date_created`) and
 * lists go out INDEXED (`form_ids[0]=1&form_ids[1]=2`) — the docs' own
 * authentication page calls out that "array parameters must be indexed
 * correctly". `search` is documented as a JSON blob in the query string
 * (`search={"field_filters":[{"key":2,"value":"test","operator":"contains"}]}`)
 * and is serialised that way.
 */
import type { HookContext } from "@w6w/types";

/** The REST namespace Gravity Forms registers on the site's WordPress REST API. */
export const REST_NAMESPACE = "gf/v2";

/** WordPress' REST API root, relative to the site URL. */
export const WP_REST_ROOT = "/wp-json";

/**
 * Public (redacted-safe) connection metadata. The auth method's `afterConnect`
 * hook publishes this onto `connection.display` so action code can compute the
 * base URL without touching the credential.
 */
export interface GravityFormsConnectionDisplay {
  /** Base URL of the WordPress install, e.g. `https://example.com` or `https://example.com/blog`. */
  siteUrl?: string;
}

/**
 * Normalise a user-entered site URL into a bare site root.
 *
 * Handles the three ways people paste it: with a trailing slash, with the
 * WordPress REST root already appended (`…/wp-json`), and with the whole
 * Gravity Forms route appended (`…/wp-json/gf/v2`). A subdirectory install's
 * path (`https://site.com/blog`) is preserved — stripping it would silently
 * point every request at the wrong place.
 */
export function normalizeSiteUrl(siteUrl: string): string {
  let site = String(siteUrl ?? "").trim();
  // Strip a trailing slash first so the suffix matches below are anchored.
  site = site.replace(/\/+$/, "");
  site = site.replace(new RegExp(`${WP_REST_ROOT}/${REST_NAMESPACE}$`, "i"), "");
  site = site.replace(new RegExp(`${WP_REST_ROOT}$`, "i"), "");
  return site.replace(/\/+$/, "");
}

/** `https://site.com/blog` -> `https://site.com/blog/wp-json/gf/v2`. */
export function resolveBaseUrl(display: GravityFormsConnectionDisplay | undefined): string {
  const site = normalizeSiteUrl(display?.siteUrl ?? "");
  if (!site) throw new Error("Gravity Forms connection is missing siteUrl");
  return `${site}${WP_REST_ROOT}/${REST_NAMESPACE}`;
}

export type QueryPrimitive = string | number | boolean;

export type QueryValue =
  | QueryPrimitive
  | null
  | undefined
  | ReadonlyArray<QueryPrimitive | null | undefined>
  | Readonly<Record<string, QueryPrimitive | null | undefined>>;

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === "";

/**
 * Flatten a query map into Gravity Forms' PHP-array wire form.
 *
 * - scalars              -> `key=value`
 * - arrays               -> `key[0]=a&key[1]=b` (re-indexed after empties drop out)
 * - one-level objects    -> `key[sub]=value`
 *
 * Empty, null and undefined values are dropped entirely rather than sent as
 * blanks, which Gravity Forms would otherwise treat as a real filter value.
 */
export function queryEntries(query: Record<string, QueryValue>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(query)) {
    if (isEmpty(value)) continue;
    if (Array.isArray(value)) {
      value.filter((v) => !isEmpty(v)).forEach((v, i) => out.push([`${key}[${i}]`, String(v)]));
      continue;
    }
    if (typeof value === "object") {
      for (const [sub, v] of Object.entries(value as Record<string, unknown>)) {
        if (isEmpty(v)) continue;
        out.push([`${key}[${sub}]`, String(v)]);
      }
      continue;
    }
    out.push([key, String(value)]);
  }
  return out;
}

/**
 * `search` rides in the query string as JSON. Accept either a ready-made string
 * (passed through verbatim) or an object/array to encode.
 */
export function serializeSearch(search: unknown): string | undefined {
  if (isEmpty(search)) return undefined;
  if (typeof search === "string") return search;
  return JSON.stringify(search);
}

/** Gravity Forms documents `_labels`, `force` and friends as 0/1 integers. */
export function boolToInt(value: boolean | undefined): 1 | undefined {
  return value ? 1 : undefined;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Gravity Forms' error envelope, shared with the WordPress REST API. */
interface GravityFormsError {
  code?: string;
  message?: string;
  data?: { status?: number };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a credential header — the
 * runtime routes every request through the auth `sign` hook, which is the only
 * code handed the credential.
 */
export class GravityFormsClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): GravityFormsClient {
    const display = (ctx.connection?.display ?? {}) as GravityFormsConnectionDisplay;
    return new GravityFormsClient(ctx, resolveBaseUrl(display));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of queryEntries(options.query ?? {})) url.searchParams.append(k, v);

    const method = (options.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    if (!res.ok) {
      let parsed: GravityFormsError | undefined;
      try {
        parsed = text ? JSON.parse(text) as GravityFormsError : undefined;
      } catch {
        // Non-JSON body (a WordPress fatal, a proxy error page) — fall through.
      }
      const detail = parsed?.message ?? (text ? text.slice(0, 300) : res.statusText);
      const code = parsed?.code ? ` (${parsed.code})` : "";
      throw new Error(
        `Gravity Forms ${res.status}${code} for ${method} ${url.pathname}: ${detail}`,
      );
    }

    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Gravity Forms returned a non-JSON body for ${method} ${url.pathname}: ${
          text.slice(0, 200)
        }`,
      );
    }
  }
}
