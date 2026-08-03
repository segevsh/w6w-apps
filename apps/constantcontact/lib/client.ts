import type { HookContext } from "@w6w/types";

/**
 * The Constant Contact **V3** API.
 *
 * Two hosts get confused for each other in the wild and only one of them is
 * this API:
 *
 *   - `https://api.cc.email/v3`            — V3. This app. OAuth2 bearer.
 *   - `https://api.constantcontact.com/v2` — the older V2 API, a different
 *                                            product surface with a different
 *                                            auth model (`api_key` +
 *                                            `access_token` query params).
 *
 * V2 is **not** dead — it still answers (an unauthenticated
 * `GET /v2/account/info` returns `401 {"error_key":"unauthorized"}`, not a
 * 410) and Constant Contact has published no sunset date. What *has* been
 * retired is the ability to mint new V2 keys. See the app README for the
 * evidence; nothing in this package touches V2.
 *
 * Base URL taken from the `servers` block of Constant Contact's own OpenAPI
 * document (`AppConnect V3`, info.version 3.0.172), served at
 * <https://developer.constantcontact.com/api_reference/bundledWithSamples.yaml>.
 */
export const API_URL = "https://api.cc.email/v3";

/**
 * Collections page with an **opaque cursor**, surfaced as a relative link
 * rather than as a bare token:
 *
 * ```json
 * { "contacts": [...], "_links": { "next": { "href": "/v3/contacts?limit=50&cursor=bGltaXQ9…" } } }
 * ```
 *
 * The `href` is a path on this same API, never an absolute URL, and the token
 * a caller needs is the `cursor` query parameter inside it. `nextCursor()`
 * below does that extraction so every list action can expose one plain
 * `cursor` param instead of asking a caller to parse a URL.
 *
 * The absence of `_links.next` is how the API says "last page" — there is no
 * total-pages counter to compare against.
 */
export interface PagingLinks {
  next?: { href?: string };
}

/** Every paged collection carries `_links`; the row key differs per resource. */
export interface PagedResponse {
  _links?: PagingLinks;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Pull the opaque `cursor` token out of a `_links.next.href`.
 *
 * Returns `undefined` on the last page (no `_links.next`) and also when the
 * link is present but carries no `cursor` — guessing a token there would be
 * worse than admitting there isn't one.
 */
export function nextCursor(links?: PagingLinks): string | undefined {
  const href = links?.next?.href;
  if (!href) return undefined;
  const q = href.indexOf("?");
  if (q === -1) return undefined;
  return new URLSearchParams(href.slice(q + 1)).get("cursor") ?? undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. No auth header is ever set here — the runtime
 * routes each request through the auth `sign` hook, which is the only code
 * handed the credential.
 */
export class ConstantContactClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(
      path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    );
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Constant Contact ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`,
      );
    }
    // 204 is the documented success for DELETE contact / DELETE email campaign.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (text.length === 0) return undefined as T;
    return JSON.parse(text) as T;
  }
}
