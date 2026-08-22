import type { HookContext } from "@w6w/types";

/**
 * Sentry's Web API is one shape across three deployment models, and the only
 * thing that varies is the host:
 *
 *   - **SaaS, US region** — `https://us.sentry.io` (the default). `sentry.io`
 *     itself still answers, but Sentry's own OpenAPI schema
 *     (https://github.com/getsentry/sentry-api-schema, `servers`) states the
 *     canonical server as `https://{region}.sentry.io` with `region` ∈
 *     `{us, de}`, so the region host is what this app defaults to.
 *   - **SaaS, EU region** — `https://de.sentry.io` (verified 2026-08-18: the
 *     host answers `401` unauthenticated, i.e. it is a live API host).
 *   - **Self-hosted** — `https://sentry.example.com`, any host the tenant runs
 *     (getsentry/self-hosted). There is no fixed hostname to allowlist, which
 *     is why the manifest declares `network.allow: ["*"]` — the same pattern
 *     `grafana`, `elastic` and `wordpress` use for arbitrary installs.
 *
 * Every path is rooted at `/api/0`. Authorization is injected upstream by the
 * auth method's `sign` hook — nothing here ever touches the credential.
 */
export const DEFAULT_ENDPOINT = "https://us.sentry.io";

/** The API path prefix every Sentry endpoint sits under. */
export const API_PREFIX = "/api/0";

/**
 * Public (redacted-safe) connection metadata. The auth methods publish this
 * onto `connection.display` at connect time so action code can compute request
 * URLs — and know which organization to talk to — without ever seeing the
 * credential.
 */
export interface SentryConnectionDisplay {
  /** Base URL of the Sentry install, e.g. `https://us.sentry.io`. */
  endpoint?: string;
  /** The organization slug this connection was made against. */
  organizationSlug?: string;
}

/** Resolve the install's base URL from public connection metadata. */
export function resolveBaseUrl(display: SentryConnectionDisplay | undefined): string {
  const endpoint = display?.endpoint?.trim();
  return (endpoint ? endpoint : DEFAULT_ENDPOINT).replace(/\/+$/, "");
}

/**
 * Resolve the organization slug: the action's own override wins, else the one
 * recorded on the Connection at connect time. Almost every Sentry endpoint is
 * organization-scoped, so failing here with a clear message beats a 404.
 */
export function resolveOrg(
  display: SentryConnectionDisplay | undefined,
  override?: unknown,
): string {
  const explicit = typeof override === "string" ? override.trim() : "";
  if (explicit) return explicit;
  const fromConnection = display?.organizationSlug?.trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "no organization slug — set one on the connection or pass `organizationSlug` on the action",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a POST/PUT doesn't send empty fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Parse Sentry's `Link` header and return the `cursor` of the next page, or
 * `undefined` when there is none.
 *
 * Sentry paginates with the Link-header standard, documented at
 * https://docs.sentry.io/api/pagination/ (fetched 2026-08-18):
 *
 *   Link: <…?&cursor=0:0:1>; rel="previous"; results="false"; cursor="0:0:1",
 *         <…?&cursor=0:100:0>; rel="next"; results="true"; cursor="0:100:0"
 *
 * `results="false"` is the load-bearing part: Sentry ALWAYS emits a `next`
 * cursor, even on the last page, "so you can query for yet-undiscovered
 * results". Following `rel="next"` without checking `results` loops forever on
 * an empty page, so both are required here.
 */
export function nextCursor(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;
  // Split on commas that separate link-values (i.e. those followed by `<`),
  // never on a comma inside a quoted parameter.
  for (const part of linkHeader.split(/,\s*(?=<)/)) {
    if (!/rel\s*=\s*"?next"?/.test(part)) continue;
    if (!/results\s*=\s*"?true"?/.test(part)) return undefined;
    const explicit = part.match(/cursor\s*=\s*"([^"]*)"/);
    if (explicit) return explicit[1];
    // Older responses carry the cursor only inside the URL.
    const url = part.match(/<([^>]+)>/);
    if (url) {
      const value = new URL(url[1]).searchParams.get("cursor");
      if (value) return value;
    }
    return undefined;
  }
  return undefined;
}

/** Thin wrapper over `ctx.fetch`. It never sets Authorization. */
export class SentryClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  /** Build a client from the Connection's public metadata. */
  static fromConnection(ctx: HookContext): SentryClient {
    const display = (ctx.connection?.display ?? {}) as SentryConnectionDisplay;
    return new SentryClient(ctx, resolveBaseUrl(display));
  }

  /** The organization slug recorded on this Connection, if any. */
  static orgFrom(ctx: HookContext, override?: unknown): string {
    return resolveOrg((ctx.connection?.display ?? {}) as SentryConnectionDisplay, override);
  }

  url(path: string, query: RequestOptions["query"] = {}): URL {
    const url = new URL(`${this.baseUrl}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Sentry repeats a key for list-valued filters (`?project=1&project=2`).
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }
    return url;
  }

  async raw(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Sentry answers with `{ "detail": "…" }` for auth/permission failures and
      // a field-keyed object for validation ones — surface the body either way,
      // it is the difference between "bad token" and "version is required".
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Sentry ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    return res;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.raw(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Sentry's Link-header cursors until `wantTotal` items are collected
   * or the vendor stops offering a next page. `per_page` is the page size on
   * the wire (Sentry's documented maximum is 100); pass `Infinity` to collect
   * everything.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;
    const pageSize = 100;
    while (items.length < wantTotal) {
      const res = await this.raw(path, {
        ...options,
        query: { ...options.query, per_page: pageSize, cursor },
      });
      const text = await res.text();
      const page = text ? JSON.parse(text) : [];
      const chunk = (Array.isArray(page) ? page : []) as T[];
      items.push(...chunk);
      cursor = nextCursor(res.headers.get("link"));
      if (!cursor || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
