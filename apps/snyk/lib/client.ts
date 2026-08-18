import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Snyk's REST API — verified against the document Snyk serves from its own API
 * host (`https://api.snyk.io/rest/openapi/{version}`, "Snyk API", 192 paths,
 * fetched 2026-08-18). `servers` names exactly `https://api.snyk.io/rest`.
 *
 * **Every request carries a `version`, and it is not optional.** Snyk's API is
 * date-versioned: `version` is a *required query parameter* on **253 of the
 * 290 operations** in that document, and a request without one is rejected.
 * `GET /openapi` lists the versions — there were 323 when this app was written.
 *
 * That is a deliberate design on Snyk's part, not an inconvenience: you pin a
 * date, and you migrate when you choose to. So this app pins one, states it,
 * and lets a Connection override it — rather than tracking "latest" and
 * changing behaviour under a running workflow.
 */
export const API_URL = "https://api.snyk.io/rest";

/**
 * The API version this app is built and tested against. Every response shape
 * the actions declare was read from this version's document.
 */
export const DEFAULT_VERSION = "2026-03-25";

/** Public (redacted-safe) connection metadata. */
export interface SnykConnectionDisplay {
  /** The API version this connection pins, if it overrides the default. */
  apiVersion?: string;
  /** The org this connection defaults to, when one was supplied. */
  orgId?: string;
}

/** Resolve the pinned API version: the connection's override, else the default. */
export function resolveVersion(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as SnykConnectionDisplay;
  return display.apiVersion?.trim() || DEFAULT_VERSION;
}

/**
 * Resolve the organization: the action's override wins, else the connection's.
 * Most of Snyk's surface is org-scoped, and the id is a UUID nobody memorises,
 * so it is collected once at connect time.
 */
export function resolveOrg(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as SnykConnectionDisplay;
  const fromConnection = display.orgId?.trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "no Snyk organization — set one on the connection or pass `orgId` on the action",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a PATCH doesn't clear untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Pull the `starting_after` cursor out of the `links.next` a JSON:API response
 * carries.
 *
 * Two shapes have to be handled, because the schema declares `next` as `oneOf`
 * a bare URL string or an object with an `href` — and the value may be relative
 * (`/rest/orgs/…?version=…&starting_after=…`) rather than absolute. The cursor
 * is extracted rather than the URL followed, so the request is rebuilt against
 * the known base with the credential intact.
 */
export function cursorFromNext(next: unknown): string | undefined {
  const href = typeof next === "string"
    ? next
    : typeof (next as { href?: string })?.href === "string"
    ? (next as { href: string }).href
    : undefined;
  if (!href) return undefined;
  const q = href.indexOf("?");
  if (q === -1) return undefined;
  return new URLSearchParams(href.slice(q + 1)).get("starting_after") ?? undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class SnykClient {
  private version: string;

  constructor(private ctx: HookContext) {
    this.version = resolveVersion(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    // The version is stamped on every request. It is required by 253 of the
    // API's 290 operations and harmless on the rest, so there is no per-call
    // decision to get wrong.
    url.searchParams.set("version", this.version);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/vnd.api+json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // JSON:API's own media type — Snyk rejects a plain application/json body
      // on its write endpoints.
      headers["content-type"] = "application/vnd.api+json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Snyk answers JSON:API errors: `{ "errors": [{ "status", "title",
      // "detail", "source" }] }` — `detail` names the offending parameter,
      // which is the difference between a bad version and a bad org id.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Snyk ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow JSON:API's `links.next` until it is absent, collecting `data`.
   *
   * `limit` is the page size on the wire — Snyk's documented maximum is 100 —
   * and `wantTotal` caps what the caller receives.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let startingAfter: string | undefined;
    const pageSize = 100;
    while (items.length < wantTotal) {
      const page = await this.request<{ data?: T[]; links?: { next?: unknown } }>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, starting_after: startingAfter },
      });
      const chunk = page?.data ?? [];
      items.push(...chunk);
      startingAfter = cursorFromNext(page?.links?.next);
      if (!startingAfter || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
