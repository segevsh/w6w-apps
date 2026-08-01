import type { HookContext } from "@w6w/types";

/**
 * Grafana's HTTP API is identical whether you're talking to a self-hosted
 * install, an on-prem instance, or Grafana Cloud — every operation
 * (dashboards, data sources, annotations, alert rules) is a plain HTTP
 * request against `<base-url>/api/...`. But unlike a SaaS API with one fixed
 * hostname, a Grafana instance can live at ANY domain: a customer's own VPC,
 * an on-prem network, a self-managed box, or a Grafana Cloud stack
 * (`https://<stack>.grafana.net`). There is no fixed API host this app can
 * allowlist, so the instance's own base URL is collected as an `endpoint`
 * Connection field and every request is built from it.
 *
 * NOTE: The App manifest sets `network.allow: ["*"]` for exactly this reason
 * — same pattern as `elastic`, `wordpress`, and `woocommerce` for arbitrary
 * self-hosted installs.
 */
export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Public (redacted-safe) connection metadata. Auth's `afterConnect` hook
 * publishes this onto `connection.display` so action code can compute request
 * URLs without ever touching the credential.
 */
export interface GrafanaConnectionDisplay {
  /** Base URL of the Grafana instance, e.g. `https://my-stack.grafana.net`. */
  endpoint?: string;
}

/** Resolve the instance base URL from public connection metadata. */
export function resolveBaseUrl(display: GrafanaConnectionDisplay | undefined): string {
  if (!display?.endpoint) {
    throw new Error("Grafana connection is missing endpoint");
  }
  return display.endpoint.replace(/\/+$/, "");
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected upstream by the
 * `service-account-token` auth method's `sign` hook — we never touch it here.
 */
export class GrafanaClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): GrafanaClient {
    const display = (ctx.connection?.display ?? {}) as GrafanaConnectionDisplay;
    return new GrafanaClient(ctx, resolveBaseUrl(display));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
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
        `Grafana ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text.length ? JSON.parse(text) : undefined) as T;
  }
}
