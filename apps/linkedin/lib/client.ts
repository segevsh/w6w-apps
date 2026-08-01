import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.linkedin.com";

/**
 * LinkedIn versions its REST API on a monthly cadence (`YYYYMM`) and
 * deprecates each version roughly 12 months after release — a stale header
 * gets HTTP 426 "Version Header is Deprecated". Bump this periodically.
 * See https://learn.microsoft.com/en-us/linkedin/marketing/versioning.
 */
export const API_VERSION = "202607";

export interface LinkedInErrorBody {
  message?: string;
  serviceErrorCode?: number;
  status?: number;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /**
   * Sets `X-RestLi-Method`. Required by LinkedIn's Rest.li-based API for
   * request kinds an HTTP verb alone doesn't disambiguate — `FINDER` (a query
   * by `q=`), `BATCH_GET`, `PARTIAL_UPDATE`, and (per LinkedIn's own examples)
   * `DELETE`.
   */
  restliMethod?: string;
}

/**
 * Thin wrapper over `ctx.fetch` for LinkedIn's versioned REST API
 * (`/rest/...`). Every call carries the two headers LinkedIn requires on all
 * `/rest/` endpoints (`X-Restli-Protocol-Version`, `Linkedin-Version`);
 * `Authorization` is injected by the auth `sign` hook, not here.
 *
 * Two LinkedIn quirks this absorbs, both directly off the Posts API docs:
 *   - **Create returns no body.** A successful `POST` to a collection
 *     resource (e.g. `/rest/posts`) responds `201` with the new entity's URN
 *     in the `x-restli-id` response header, not the response body.
 *     `request()` surfaces that as `{ id }` when the body is empty.
 *   - **Delete is idempotent and body-less** — a `204` with no body,
 *     including on a delete replayed against an already-deleted entity
 *     (LinkedIn documents this explicitly).
 */
export class LinkedInClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "x-restli-protocol-version": "2.0.0",
      "linkedin-version": API_VERSION,
    };
    if (options.restliMethod) headers["x-restli-method"] = options.restliMethod;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail: LinkedInErrorBody = {};
      try {
        detail = await res.json();
      } catch {
        /* body wasn't JSON — fall back to statusText below */
      }
      throw new Error(
        `LinkedIn ${res.status} for ${options.method ?? "GET"} ${url.pathname}: ${
          detail.message ?? res.statusText
        }`,
      );
    }

    if (res.status === 204) return undefined as T;

    const restliId = res.headers.get("x-restli-id");
    const text = await res.text();
    if (!text) {
      return (restliId ? { id: restliId } : undefined) as T;
    }
    return JSON.parse(text) as T;
  }
}

/** Build a Person URN from a member id (the OIDC `sub`, or a raw numeric id). */
export function personUrn(id: string): string {
  return id.startsWith("urn:li:") ? id : `urn:li:person:${id}`;
}

/** Build an Organization URN from a numeric company-page id. */
export function organizationUrn(id: string): string {
  return id.startsWith("urn:li:") ? id : `urn:li:organization:${id}`;
}

/**
 * URL-encode a URN for use as a REST path segment or query value, per
 * LinkedIn's documented examples (`urn:li:share:123` -> `urn%3Ali%3Ashare%3A123`).
 */
export function encodeUrn(urn: string): string {
  return encodeURIComponent(urn);
}

export interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  email?: string;
  email_verified?: boolean;
}

/**
 * `GET /v2/userinfo` — the OpenID Connect userinfo endpoint from the "Sign In
 * with LinkedIn using OpenID Connect" product. Deliberately NOT routed
 * through `LinkedInClient`: it's an OIDC-standard endpoint, not part of the
 * versioned `/rest/` API, and takes neither `Linkedin-Version` nor
 * `X-Restli-Protocol-Version`. Needs only the `openid` + `profile` scopes,
 * so it's the narrowest-scope probe available for both auth methods this app
 * declares — see `auth/oauth2.ts` `test`.
 */
export function fetchUserInfo(ctx: HookContext): Promise<Response> {
  return ctx.fetch(`${API_URL}/v2/userinfo`, { headers: { accept: "application/json" } });
}
