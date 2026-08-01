import type { HookContext } from "@w6w/types";

/**
 * Inlined base64 encoder — the app sandbox has `import: false`, so hooks can't
 * pull from jsr:@std/encoding at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps. Shared
 * here because both auth methods (`api-key`, `basic`) need it.
 */
export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * Elasticsearch is unusually, among databases, natively HTTP/REST — every
 * operation (search, index, get, delete, cat) is a plain HTTP request, even
 * against a self-hosted cluster. But a self-hosted cluster can live at ANY
 * domain (a customer's own VPC, an on-prem network, any port), so there is no
 * fixed API host this app can allowlist. The cluster's own base URL is
 * therefore collected as an `endpoint` Connection field and every request is
 * built from it.
 *
 * NOTE: The App manifest sets `network.allow: ["*"]` for exactly this reason
 * — same pattern as `wordpress` and `woocommerce` for self-hosted installs.
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
export interface ElasticConnectionDisplay {
  /** Base URL of the cluster, e.g. `https://my-cluster.es.example.com:9200`. */
  endpoint?: string;
}

/** Resolve the cluster base URL from public connection metadata. */
export function resolveBaseUrl(display: ElasticConnectionDisplay | undefined): string {
  if (!display?.endpoint) {
    throw new Error("Elasticsearch connection is missing endpoint");
  }
  return display.endpoint.replace(/\/+$/, "");
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected upstream by the
 * auth method's `sign` hook — we never touch it here.
 */
export class ElasticClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): ElasticClient {
    const display = (ctx.connection?.display ?? {}) as ElasticConnectionDisplay;
    return new ElasticClient(ctx, resolveBaseUrl(display));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
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
        `Elasticsearch ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text.length ? JSON.parse(text) : undefined) as T;
  }
}
