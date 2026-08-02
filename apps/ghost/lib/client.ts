import type { HookContext } from "@w6w/types";

/**
 * Ghost's Admin API is self-hosted per-tenant: `https://<your-site>/ghost/api/admin/`
 * (or, for Ghost(Pro), the domain shown as the integration's "API URL", which may
 * differ from the site's public custom domain). Both cases flow through this client
 * — the base URL is resolved from the caller's Connection at request time.
 *
 * NOTE: The App manifest sets `network.allow: ["*"]` because a Ghost site lives on
 * the customer's own domain and we can't allow-list it in advance (see WordPress and
 * Shopify's write-ups for the same shape of problem — Shopify gets away with a
 * `*.myshopify.com` wildcard because every store lives under one apex; Ghost, like
 * WordPress, has no such shared apex, so it needs the full wildcard).
 *
 * Ghost's REST envelope is distinctive and load-bearing here: every resource is a
 * PLURAL key wrapping an ARRAY, in both directions —
 *   GET  /posts/        -> { posts: [ {...}, {...} ], meta: { pagination: {...} } }
 *   GET  /posts/:id/     -> { posts: [ {...} ] }               (still an array of 1)
 *   POST /posts/         body: { posts: [ { title: "..." } ] } -> { posts: [ {...} ] }
 *   PUT  /posts/:id/     body: { posts: [ { title: "..." } ] } -> { posts: [ {...} ] }
 * `/site/` is the one documented exception — it returns a bare `{ site: {...} }`
 * object, not an array (see `site()` below).
 *
 * Every collection/resource path also requires a TRAILING SLASH (`/posts/`, not
 * `/posts`) — Ghost 404s otherwise. Confirmed against Ghost's own reference client
 * (`github.com/TryGhost/SDK` → `packages/admin-api/lib/admin-api.js`,
 * `endpointFor()`).
 */
export interface GhostConnectionDisplay {
  /** Base URL of the Ghost site's Admin API, e.g. `https://example.com`. */
  siteUrl?: string;
}

/** Resolve the Admin API base URL from public (redacted) connection metadata. */
export function resolveBaseUrl(display: GhostConnectionDisplay | undefined): string {
  if (!display?.siteUrl) throw new Error("Ghost connection is missing siteUrl");
  const trimmed = display.siteUrl.replace(/\/+$/, "");
  return `${trimmed}/ghost/api/admin`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  body?: unknown;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): URL {
  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        url.searchParams.set(k, v.join(","));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url;
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected upstream by the
 * `admin-api-key` auth method's `sign` hook — we never touch it here.
 */
export class GhostClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): GhostClient {
    const display = (ctx.connection?.display ?? {}) as GhostConnectionDisplay;
    return new GhostClient(ctx, resolveBaseUrl(display));
  }

  /** Raw request. Returns `undefined` for a 204, else the parsed JSON envelope. */
  private async raw(
    path: string,
    options: RequestOptions = {},
  ): Promise<Record<string, unknown> | undefined> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      (init.headers as Record<string, string>)["accept"] = "application/json";
      init.body = JSON.stringify(options.body);
    } else {
      (init.headers as Record<string, string>)["accept"] = "application/json";
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Ghost ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined;
    return await res.json() as Record<string, unknown>;
  }

  /** `GET /<resource>/` — list. Returns the unwrapped array plus pagination `meta`. */
  async browse<T = unknown>(
    resource: string,
    query?: RequestOptions["query"],
  ): Promise<{ items: T[]; meta?: unknown }> {
    const json = await this.raw(`/${resource}/`, { query });
    return { items: (json?.[resource] as T[] | undefined) ?? [], meta: json?.meta };
  }

  /** `GET /<resource>/:id/` — single read. Unwraps the 1-element envelope array. */
  async read<T = unknown>(
    resource: string,
    id: string,
    query?: RequestOptions["query"],
  ): Promise<T> {
    const json = await this.raw(`/${resource}/${id}/`, { query });
    const items = (json?.[resource] as T[] | undefined) ?? [];
    return items[0];
  }

  /** `POST /<resource>/` — create. Body and response both wrap a 1-element array. */
  async create<T = unknown>(
    resource: string,
    body: unknown,
    query?: RequestOptions["query"],
  ): Promise<T> {
    const json = await this.raw(`/${resource}/`, {
      method: "POST",
      body: { [resource]: [body] },
      query,
    });
    const items = (json?.[resource] as T[] | undefined) ?? [];
    return items[0];
  }

  /** `PUT /<resource>/:id/` — update. Same envelope shape as `create`. */
  async update<T = unknown>(
    resource: string,
    id: string,
    body: unknown,
    query?: RequestOptions["query"],
  ): Promise<T> {
    const json = await this.raw(`/${resource}/${id}/`, {
      method: "PUT",
      body: { [resource]: [body] },
      query,
    });
    const items = (json?.[resource] as T[] | undefined) ?? [];
    return items[0];
  }

  /** `DELETE /<resource>/:id/` — always a 204 with no body. */
  async destroy(resource: string, id: string, query?: RequestOptions["query"]): Promise<void> {
    await this.raw(`/${resource}/${id}/`, { method: "DELETE", query });
  }

  /**
   * `GET /site/` — the one endpoint whose envelope is a bare object, not an
   * array (`{ site: {...} }`), and the one endpoint Ghost itself does not
   * require authentication for.
   */
  async site<T = unknown>(): Promise<T> {
    const json = await this.raw("/site/");
    return json?.site as T;
  }
}
