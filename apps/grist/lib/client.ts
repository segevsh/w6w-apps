import type { HookContext } from "@w6w/types";

/**
 * Grist's REST API lives at `<site>/api` on *every* deployment — there is no
 * separate api.* host. Three shapes of `<site>` exist and all three are the
 * same server (grist-core), so all three flow through this one client:
 *
 *   - `https://docs.getgrist.com`  — the hosted **personal** site
 *   - `https://<team>.getgrist.com` — a hosted **team** site
 *   - `https://grist.example.com`   — a **self-hosted** install (grist-core /
 *                                     `gristlabs/grist` / `gristlabs/grist-oss`)
 *
 * The site is therefore per-Connection, not a constant. It is collected as an
 * auth field, republished onto `connection.display.siteUrl` by `afterConnect`,
 * and resolved here at request time — so action code never sees a credential
 * and never hard-codes a host.
 *
 * NOTE: the App manifest sets `network.allow: ["*"]`. A self-hosted Grist lives
 * on the customer's own domain, which no manifest can enumerate ahead of time.
 * See README § "Why the egress allowlist is `*`".
 */

/** Public (redacted-safe) Connection metadata. Never the credential. */
export interface GristConnectionDisplay {
  /** Base URL of the Grist site, e.g. `https://docs.getgrist.com`. No `/api`. */
  siteUrl?: string;
}

/** The hosted personal site — the default a user gets if they change nothing. */
export const DEFAULT_SITE_URL = "https://docs.getgrist.com";

/**
 * `<site>/api`, with a trailing slash and any accidental `/api` suffix trimmed
 * off first. Users paste the URL out of their browser bar, and
 * `https://docs.getgrist.com/api` is exactly as plausible a thing to paste as
 * `https://docs.getgrist.com` — silently producing `/api/api/orgs` would be a
 * baffling 404.
 */
export function resolveBaseUrl(display: GristConnectionDisplay | undefined): string {
  const raw = display?.siteUrl?.trim();
  if (!raw) throw new Error("Grist connection is missing siteUrl");
  const trimmed = raw.replace(/\/+$/, "").replace(/\/api$/i, "");
  return `${trimmed}/api`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * A page of records. Grist returns `{ records: [{ id, fields }] }` with **no
 * cursor and no total** — `limit` truncates, it does not paginate. Walking a
 * large table means ordering by a stable column and filtering forward, or
 * dropping to `run-sql` with `LIMIT`/`OFFSET`. See README § "There is no cursor".
 */
export interface GristRecordsList<F = Record<string, unknown>> {
  records: Array<{
    id: number;
    fields: F;
    /** Present only when a formula errored; the matching `fields` value is null. */
    errors?: Record<string, string>;
  }>;
}

/** `POST /docs/{docId}/sql` — the statement is echoed back beside the rows. */
export interface GristSqlResultSet {
  statement: string;
  records: Array<{ fields: Record<string, unknown> }>;
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected upstream by the auth
 * method's `sign` hook — nothing here ever reads, builds or logs a credential,
 * and the error text below carries only the status and the path.
 */
export class GristClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): GristClient {
    const display = (ctx.connection?.display ?? {}) as GristConnectionDisplay;
    return new GristClient(ctx, resolveBaseUrl(display));
  }

  /** JSON in, JSON out. `204` and an empty body both resolve to `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (text.length === 0) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Same request, returned verbatim as text.
   *
   * The `/download/csv|tsv|dsv` endpoints answer `text/csv` (etc.), not JSON.
   * Running them through `request` would throw on `JSON.parse` — a confusing
   * failure for a call that actually succeeded.
   */
  async requestText(path: string, options: RequestOptions = {}): Promise<string> {
    const res = await this.send(path, options);
    return await res.text();
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(
      path.startsWith("http") ? path : `${this.baseUrl}/${path.replace(/^\/+/, "")}`,
    );
    if (options.query) applyQuery(url, options.query);

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    const headers = init.headers as Record<string, string>;
    headers["accept"] = "application/json";
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Grist ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    return res;
  }
}

/**
 * Grist takes every query param as a single scalar — there are no bracketed
 * repeats and no comma-splitting to do here. `filter` is the one that looks
 * like an exception and is not: it is a **JSON object encoded as one string**
 * (`{"pet": ["cat", "dog"]}`), which `URL.searchParams` percent-encodes
 * correctly on its own.
 *
 * `undefined`, `null` and `""` are skipped so callers can forward optional
 * params without branching. `false` and `0` are NOT skipped: `hidden=false`
 * and `limit=0` are both meaningful to Grist (`limit=0` means "no limit").
 */
function applyQuery(
  url: URL,
  query: Record<string, string | number | boolean | undefined | null>,
): void {
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
}

/**
 * `filter` accepts either a ready-made JSON string or an object. Actions expose
 * it as a `json` param, and the host may hand a `json` param through as either
 * shape depending on whether the user typed it or a previous step produced it.
 */
export function encodeFilter(filter: unknown): string | undefined {
  if (filter === undefined || filter === null || filter === "") return undefined;
  return typeof filter === "string" ? filter : JSON.stringify(filter);
}
