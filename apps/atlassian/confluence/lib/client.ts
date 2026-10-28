import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Confluence Cloud REST API **v2** is the current surface, and it is a
 * different API from v1 rather than a revision of it: different paths,
 * different pagination, and IDs where v1 used content keys. Everything in this
 * app is v2 — with two deliberate exceptions, both documented on the actions
 * that use them (`content-search` and `user-current`), because v2 publishes no
 * equivalent.
 */
export const API_PATH = "/wiki/api/v2";

/** The v1 base, used only where v2 has no equivalent endpoint. */
export const API_PATH_V1 = "/wiki/rest/api";

/**
 * Confluence Cloud is reachable two ways, and which one applies depends on how
 * the Connection was made — the same split as the `jira` app in this pack:
 *
 *   - **API token** — the site's own host, `acme.atlassian.net`. The site name
 *     is an Auth field, recorded on the connection's `display`.
 *   - **OAuth 2.0 (3LO)** — a shared gateway,
 *     `api.atlassian.com/ex/confluence/{cloudId}`. The cloud id is resolved
 *     from `/oauth/token/accessible-resources` in `afterConnect` and recorded
 *     the same way.
 *
 * Both hosts are on the egress allowlist; `*.atlassian.net` covers the first
 * because no manifest can enumerate customer sites.
 */
export function hostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { site?: string; cloudId?: string };
  if (display.cloudId) return `https://api.atlassian.com/ex/confluence/${display.cloudId}`;
  if (display.site) return `https://${display.site}.atlassian.net`;
  throw new Error(
    "Confluence connection has neither a site nor a cloud id — reconnect so one can be recorded.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
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
 * Build the `body` object v2 write endpoints take: `{representation, value}`,
 * where representation is `storage` (Confluence's XHTML storage format),
 * `wiki` (wiki markup) or `atlas_doc_format` (ADF, the JSON one).
 *
 * `storage` is the default because it is what Confluence itself stores and
 * what the read endpoints hand back, so a read-edit-write round trip does not
 * silently change format.
 */
export function contentBody(
  value: unknown,
  representation = "storage",
): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return { representation, value: String(value) };
}

/**
 * Pull the opaque cursor out of the relative URL Confluence returns for the
 * next page.
 *
 * v2 answers `{ results: [...], _links: { next, base } }`, where `next` is
 * documented as "the relative URL for the next set of results, using a cursor
 * query parameter" and is **absent when there is no more data** — a clean
 * termination signal. The cursor is extracted rather than the URL followed,
 * because the relative URL is written for the site host and an OAuth
 * connection talks to the `api.atlassian.com` gateway instead; re-issuing the
 * original request with the cursor is correct for both.
 */
export function cursorFromNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  const q = next.indexOf("?");
  if (q === -1) return undefined;
  return new URLSearchParams(next.slice(q + 1)).get("cursor") ?? undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class ConfluenceClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = hostFromConnection(ctx.connection);
  }

  private url(base: string, path: string, query: RequestOptions["query"] = {}): URL {
    const url = new URL(`${this.host}${base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Confluence repeats a key for its list-valued filters (`?id=1&id=2`).
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }
    return url;
  }

  private async send<T>(url: URL, options: RequestOptions): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Confluence answers `{ "errors": [{ "status", "code", "title" }] }` —
      // the title is the difference between "no such space" and "you lack
      // permission on it".
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Confluence ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** A v2 request (`/wiki/api/v2/...`). */
  request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(this.url(API_PATH, path, options.query), options);
  }

  /** A v1 request (`/wiki/rest/api/...`), for the two endpoints v2 lacks. */
  requestV1<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(this.url(API_PATH_V1, path, options.query), options);
  }

  /**
   * Follow v2's cursor pagination until `wantTotal` items are collected or
   * Confluence stops offering a next page. `limit` is the page size on the
   * wire; Confluence's documented maximum varies by endpoint (250 for most),
   * so 100 is used as a safe page size everywhere.
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
      const page = await this.request<{ results?: T[]; _links?: { next?: string } }>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, cursor },
      });
      const chunk = page?.results ?? [];
      items.push(...chunk);
      cursor = cursorFromNext(page?._links?.next);
      if (!cursor || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
