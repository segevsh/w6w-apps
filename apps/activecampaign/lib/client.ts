import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * ActiveCampaign gives every account its own API host — there is no fixed
 * suffix a manifest can allowlist. ActiveCampaign's own docs put it plainly:
 * "It is explicitly not a guarantee that api-us1.com is always a supported
 * API Base URL for all current and future users" (developers.activecampaign.com
 * /reference/url). The account's *own* Settings → Developer page is the only
 * authoritative source, which is why `w6w.network.allow` is `["*"]` and the
 * URL is collected as a connect-time field rather than assumed.
 *
 * The base URL (e.g. `https://youraccountname.api-us1.com`, no trailing
 * `/api/3`) is stored on the credential and republished onto the connection's
 * redacted `display.apiUrl` by the auth method's `afterConnect`, so action
 * code — which never sees the credential — can build request URLs from it.
 */
export function apiUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiUrl?: string };
  if (display.apiUrl) return display.apiUrl.replace(/\/+$/, "");
  throw new Error(
    "ActiveCampaign connection has no apiUrl — reconnect the account so it can be recorded.",
  );
}

/** Every ActiveCampaign v3 resource hangs off this fixed path segment. */
export function baseUrl(apiUrl: string): string {
  return `${apiUrl.replace(/\/+$/, "")}/api/3`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is never set here — the
 * runtime routes every request through the auth `sign` hook, which injects
 * the `Api-Token` header.
 */
export class ActiveCampaignClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(apiUrlFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path.startsWith("/") ? path : `/${path}`}`);
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
      // ActiveCampaign returns `{ success: false, error }` or `{ errors: [...] }`
      // on failure — the body is where the actionable detail lives.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `ActiveCampaign ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
