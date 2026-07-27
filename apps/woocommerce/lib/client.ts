import type { HookContext } from "@w6w/types";

/**
 * WooCommerce runs *inside* the tenant's own WordPress install — its REST API
 * lives at `https://<your-store>/wp-json/wc/v3`. There is no vendor-owned host
 * to allow-list, so the App manifest sets `network.allow: ["*"]` (the same
 * choice WordPress makes) and the base URL is resolved per-Connection from the
 * store's own URL at request time.
 */
export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  body?: unknown;
}

/**
 * Public (redacted-safe) connection metadata we care about. The auth method's
 * `afterConnect` hook publishes this onto `connection.display` so action code
 * can compute the base URL without ever touching the credential.
 */
export interface WooCommerceConnectionDisplay {
  /** Base URL of the store's WordPress install, e.g. `https://shop.example.com`. */
  storeUrl?: string;
}

/**
 * Resolve the `/wp-json/wc/v3` base URL from public connection metadata. A
 * trailing slash on the stored `storeUrl` is tolerated and stripped.
 */
export function resolveBaseUrl(display: WooCommerceConnectionDisplay | undefined): string {
  const storeUrl = display?.storeUrl?.replace(/\/+$/, "");
  if (!storeUrl) throw new Error("WooCommerce connection is missing storeUrl");
  return `${storeUrl}/wp-json/wc/v3`;
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected upstream by the
 * auth method's `sign` hook (HTTP Basic `ck:cs`) — we never touch it here.
 */
export class WooCommerceClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): WooCommerceClient {
    const display = (ctx.connection?.display ?? {}) as WooCommerceConnectionDisplay;
    return new WooCommerceClient(ctx, resolveBaseUrl(display));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${this.baseUrl}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          if (v.length === 0) continue;
          url.searchParams.set(k, v.join(","));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

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
        `WooCommerce ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
