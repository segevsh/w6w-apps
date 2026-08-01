import type { HookContext } from "@w6w/types";

/**
 * Strapi is self-hosted (or Strapi Cloud) — every installation lives at its
 * own domain, so there is no fixed API host this app can allowlist. The
 * instance's own base URL is collected as an `endpoint` Connection field (see
 * `../auth/api-token.ts`) and every request is built from it.
 *
 * NOTE: The App manifest sets `network.allow: ["*"]` for exactly this reason
 * — same pattern as `wordpress` and `elastic` for self-hosted installs.
 */
export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

/**
 * Public (redacted-safe) connection metadata. Auth's `afterConnect` hook
 * publishes this onto `connection.display` so action code can compute request
 * URLs without ever touching the credential.
 */
export interface StrapiConnectionDisplay {
  /** Base URL of the Strapi instance, e.g. `https://my-project.strapiapp.com`. */
  endpoint?: string;
}

/** Resolve the instance base URL from public connection metadata. */
export function resolveBaseUrl(display: StrapiConnectionDisplay | undefined): string {
  if (!display?.endpoint) {
    throw new Error("Strapi connection is missing endpoint");
  }
  return display.endpoint.replace(/\/+$/, "");
}

/**
 * Encode a value into Strapi's nested bracket-notation query syntax —
 * `filters[title][$eq]=x`, `sort[0]=name:asc`, `populate[a][populate][b]=true`,
 * `pagination[page]=1` — the form every REST API query param uses per
 * Strapi's own docs (https://docs.strapi.io/cms/api/rest), because the server
 * parses the query string with `qs`. Arrays serialize with numeric indices —
 * the same `arrayFormat: "indices"` convention the reference n8n Strapi node
 * configures explicitly, for the same reason.
 */
export function appendBracketParams(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => appendBracketParams(params, `${key}[${i}]`, v));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      appendBracketParams(params, `${key}[${k}]`, v);
    }
    return;
  }
  params.set(key, String(value));
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected upstream by the
 * `api-token` auth method's `sign` hook — we never touch it here.
 */
export class StrapiClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): StrapiClient {
    const display = (ctx.connection?.display ?? {}) as StrapiConnectionDisplay;
    return new StrapiClient(ctx, resolveBaseUrl(display));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        appendBracketParams(url.searchParams, k, v);
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
        `Strapi ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text.length ? JSON.parse(text) : undefined) as T;
  }
}
