import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Every Supabase project has its own host — `https://<project-ref>.supabase.co`.
 * A manifest cannot enumerate those, so `w6w.network.allow` declares the
 * wildcard `*.supabase.co`; the runtime's egress matcher accepts any subdomain
 * of it and still refuses everything else.
 *
 * The project URL comes from the Connection, not from an Action param: the
 * `api-key` auth method stashes it on the connection's redacted `display` in
 * `afterConnect`, and this client reads it from there — exactly the pattern
 * `zendesk`'s subdomain and `wordpress`'s siteUrl use.
 */
export function projectUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { projectUrl?: string };
  if (display.projectUrl) return display.projectUrl.replace(/\/+$/, "");
  throw new Error(
    "Supabase connection has no projectUrl — reconnect the project so it can be recorded.",
  );
}

/** The PostgREST data API root for a project: `https://<ref>.supabase.co/rest/v1`. */
export function restUrl(projectUrl: string): string {
  return `${projectUrl.replace(/\/+$/, "")}/rest/v1`;
}

export interface RequestOptions {
  method?: string;
  /** Structured query params (select, order, limit, offset, on_conflict, ...). */
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * A raw PostgREST filter query-string fragment, e.g. `"age=lt.13&student=is.true"`
   * or `"id=eq.5"`. Parsed with `URLSearchParams` (which correctly splits `&`/`=`
   * and preserves operator values like `lt.13` or `in.(1,2,3)`) and appended
   * verbatim — see
   * https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering-rows.
   */
  filters?: string;
  body?: unknown;
  /** Extra headers, merged over the client's defaults (e.g. `Prefer`, `Accept`). */
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset so we don't send `foo=undefined` in a query string. */
export function compact(
  obj: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
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
 * Parse a JSON `Param` value that may already have been given to us as a
 * decoded object/array (structured input) or as a raw JSON string (form input).
 */
export function parseJsonParam(raw: unknown): unknown {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets `apikey` or `Authorization` —
 * the runtime routes every request through the auth `sign` hook, which stamps
 * both headers from the stored credential.
 */
export class SupabaseClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = restUrl(projectUrlFromConnection(ctx.connection));
  }

  private buildUrl(path: string, options: Pick<RequestOptions, "query" | "filters">): URL {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    if (options.filters) {
      for (const [k, v] of new URLSearchParams(options.filters)) {
        url.searchParams.append(k, v);
      }
    }
    return url;
  }

  /** Issue a request and parse a JSON (or empty) body. Throws with PostgREST's error detail on failure. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options);
    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // PostgREST error bodies are `{ message, details?, hint?, code? }` — the
      // body is where the actionable part is.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Supabase ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * `HEAD` request with `Prefer: count=exact`, for reading the total row count
   * off the `Content-Range` response header without transferring any rows. See
   * https://postgrest.org/en/stable/references/api/pagination_count.html.
   */
  async count(path: string, options: Pick<RequestOptions, "query" | "filters"> = {}): Promise<{
    count: number | null;
    contentRange: string | null;
  }> {
    const url = this.buildUrl(path, options);
    const res = await this.ctx.fetch(url.toString(), {
      method: "HEAD",
      headers: { prefer: "count=exact" },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Supabase ${res.status} ${res.statusText} for HEAD ${url.pathname}: ${detail}`,
      );
    }
    const contentRange = res.headers.get("content-range");
    const total = contentRange?.split("/")[1];
    const count = total && total !== "*" ? Number(total) : null;
    return { count, contentRange };
  }
}
