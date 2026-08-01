import type { HookContext, RedactedConnection } from "@w6w/types";

/** PayPal's REST API hosts. Which one a Connection uses is a form choice, not a fixed constant. */
export const API_URL_LIVE = "https://api-m.paypal.com";
export const API_URL_SANDBOX = "https://api-m.sandbox.paypal.com";

/** PayPal's OAuth2 client-credentials token endpoint lives on the same host as the API. */
export const TOKEN_PATH = "/v1/oauth2/token";

/**
 * The `sandbox` toggle is collected once, at connect time (see
 * `auth/client-credentials.ts`), and echoed onto the Connection's redacted
 * `display` by `afterConnect` — so every Action can pick the right host
 * without ever seeing the credential itself.
 */
export function sandboxFromConnection(connection: RedactedConnection | undefined): boolean {
  const display = (connection?.display ?? {}) as { sandbox?: boolean };
  return display.sandbox === true;
}

export function baseUrl(sandbox: boolean): string {
  return sandbox ? API_URL_SANDBOX : API_URL_LIVE;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset so a PATCH/POST doesn't send nulls PayPal will reject. */
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
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook. The host is resolved
 * from the Connection's `display.sandbox`, recorded by `afterConnect`.
 */
export class PayPalClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(sandboxFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.body));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // PayPal returns { name, message, details: [{ issue, description }] } —
      // `message` names the problem; `details` (when present) names the field.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `PayPal ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    // Several endpoints (payout-item cancel, some 204s) return no body.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
