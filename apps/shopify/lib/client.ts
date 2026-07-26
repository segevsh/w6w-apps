import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Admin API version. Shopify releases quarterly and supports each version for
 * a year, so this is pinned rather than left to float onto whatever is current.
 */
export const API_VERSION = "2024-07";

/**
 * Every store has its own host — `acme.myshopify.com`. A manifest cannot
 * enumerate those, so `w6w.network.allow` declares `*.myshopify.com` and the
 * runtime's egress matcher accepts any store subdomain while refusing the rest.
 *
 * The store handle comes from the Connection (recorded by `afterConnect`), not
 * from an Action param — it identifies the account, not the operation.
 */
export function shopFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { shop?: string };
  if (display.shop) return display.shop;
  throw new Error(
    "Shopify connection has no store handle — reconnect the store so it can be recorded.",
  );
}

export function baseUrl(shop: string): string {
  return `https://${shop}.myshopify.com/admin/api/${API_VERSION}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Shopify paginates with a `Link` header, not a body field:
 *   Link: <https://…/orders.json?page_info=xyz&limit=50>; rel="next"
 * Actions expose the extracted `page_info` so a workflow can loop without
 * parsing headers itself.
 */
export function nextPageInfo(link: string | null): string | undefined {
  if (!link) return undefined;
  for (const part of link.split(",")) {
    if (!/rel="?next"?/.test(part)) continue;
    const url = part.match(/<([^>]+)>/)?.[1];
    if (!url) continue;
    return new URL(url).searchParams.get("page_info") ?? undefined;
  }
  return undefined;
}

export interface Paged<T> {
  /** The resource array, under whatever key Shopify used (`orders`, `products`, …). */
  data: T[];
  /** Cursor for the next page, or undefined on the last one. */
  nextPageInfo?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the auth header — the runtime
 * routes every request through the auth `sign` hook.
 */
export class ShopifyClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(shopFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.raw<T>(path, options)).body;
  }

  /** Like `request`, but also returns the response so pagination headers can be read. */
  async raw<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ body: T; response: Response }> {
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
      // Shopify returns { errors: "Not Found" } or { errors: { title: [...] } }.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Shopify ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return { body: undefined as T, response: res };
    const text = await res.text();
    return { body: (text ? JSON.parse(text) : undefined) as T, response: res };
  }

  /** GET a collection and pair it with the `Link`-header cursor. */
  async list<T>(path: string, key: string, query: RequestOptions["query"]): Promise<Paged<T>> {
    const { body, response } = await this.raw<Record<string, T[]>>(path, { query });
    return {
      data: body?.[key] ?? [],
      nextPageInfo: nextPageInfo(response.headers.get("link")),
    };
  }
}
