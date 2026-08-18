import type { HookContext } from "@w6w/types";

/**
 * Vercel's REST API — one host, `https://api.vercel.com`, stated as the sole
 * server in Vercel's own OpenAPI document (https://openapi.vercel.sh/,
 * fetched 2026-08-18). No self-hosted variant exists, so the manifest's
 * egress allowlist is that single hostname.
 *
 * **Paths carry their own version.** Vercel versions per endpoint, not per
 * API: `/v7/deployments`, `/v13/deployments/{id}`, `/v9/projects/{idOrName}`,
 * `/v10/projects` all coexist. There is no base version to factor out, so
 * every action states the full versioned path exactly as the OpenAPI document
 * lists it, and the client prepends nothing.
 *
 * Authorization is injected upstream by the auth method's `sign` hook —
 * nothing here ever touches the credential.
 */
export const API_URL = "https://api.vercel.com";

/**
 * Public (redacted-safe) connection metadata, published by the auth methods at
 * connect time.
 */
export interface VercelConnectionDisplay {
  /**
   * The Team the connection acts on behalf of. Blank means the token's own
   * personal account — Vercel's default, per its REST API docs: "By default,
   * you can access resources in your personal account. To access resources
   * owned by a team, append the Team ID as a query string."
   */
  teamId?: string;
  /** The team slug, when the connection was made with one instead of an ID. */
  teamSlug?: string;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a POST/PATCH doesn't send empty fields. */
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

/** Thin wrapper over `ctx.fetch`. It never sets Authorization. */
export class VercelClient {
  constructor(private ctx: HookContext, private team: VercelConnectionDisplay = {}) {}

  /** Build a client carrying the Connection's team scope. */
  static fromConnection(ctx: HookContext, teamOverride?: unknown): VercelClient {
    const display = (ctx.connection?.display ?? {}) as VercelConnectionDisplay;
    const override = typeof teamOverride === "string" ? teamOverride.trim() : "";
    return new VercelClient(ctx, override ? { teamId: override } : display);
  }

  /**
   * The team scope as query params. Vercel accepts either `teamId` or `slug`;
   * sending neither is not an error — it is how you address the token's own
   * personal account.
   */
  private scope(): Record<string, string | undefined> {
    return { teamId: this.team.teamId || undefined, slug: this.team.teamSlug || undefined };
  }

  url(path: string, query: RequestOptions["query"] = {}): URL {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries({ ...query, ...this.scope() })) {
      if (v === undefined || v === null || v === "") continue;
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
      // Vercel's error envelope is `{ "error": { "code", "message" } }` —
      // surface it verbatim, the code is the difference between
      // `forbidden` and `not_found`.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Vercel ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
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
   * Follow Vercel's timestamp pagination until `wantTotal` items are collected
   * or the vendor stops offering a next page.
   *
   * The contract, from the OpenAPI document's shared `Pagination` schema:
   * a paged response carries `{ pagination: { count, next, prev } }` where
   * `next` is "a timestamp that must be used to request the next page" and is
   * **`null` on the last page**. That timestamp goes back as `until`, which
   * every paged Vercel collection accepts. `limit` is the page size on the
   * wire.
   */
  async requestAll<T = unknown>(
    path: string,
    collectionKey: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
    pageSize = 100,
  ): Promise<T[]> {
    const items: T[] = [];
    let until: number | undefined;
    while (items.length < wantTotal) {
      const page = await this.request<Record<string, unknown>>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, until },
      });
      const chunk = (page?.[collectionKey] as T[] | undefined) ?? [];
      items.push(...chunk);
      const next = (page?.pagination as { next?: number | null } | undefined)?.next;
      if (next === undefined || next === null || chunk.length === 0) break;
      until = next;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
