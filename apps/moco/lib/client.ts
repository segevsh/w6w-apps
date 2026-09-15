import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * MOCO gives every account its own host — `{account}.mocoapp.com` — confirmed against the
 * `servers` block of MOCO's own OpenAPI document (`docs.mocoapp.com/api/docs/v1.yaml`, fetched
 * 2026-09-15): `https://{account}.mocoapp.com/api/v1`. A manifest cannot enumerate every
 * customer's subdomain, so `w6w.network.allow` declares the wildcard `*.mocoapp.com` — the
 * runtime's egress matcher accepts any subdomain of it while still refusing everything else. Same
 * posture as `apps/freshdesk` (`*.freshdesk.com`).
 *
 * The account subdomain identifies the tenant, so it belongs to the Connection, not to an Action
 * param. `afterConnect` echoes it onto the connection's display data, which is where the client
 * reads it from.
 */
export function accountFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { account?: string };
  if (display.account) return display.account;
  throw new Error(
    "MOCO connection has no account subdomain — reconnect it so it can be recorded.",
  );
}

export function baseUrl(account: string): string {
  return `https://${account}.mocoapp.com/api/v1`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset so a PATCH doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * MOCO's error bodies come in two documented shapes (`docs.mocoapp.com/api/docs/v1.yaml`,
 * every `422`/`401`/`403` response): `{ "message": "..." }` for auth/payload-shape errors, or
 * `{ "errors": ["...", ...] }` / `{ "errors": { field: [...] } }` for validation failures. Read
 * whichever is present rather than assuming one.
 */
export function errorDetail(text: string): string | undefined {
  if (!text) return undefined;
  try {
    const body = JSON.parse(text) as { message?: string; errors?: unknown };
    if (typeof body.message === "string" && body.message) return body.message;
    if (body.errors !== undefined) {
      if (Array.isArray(body.errors)) return body.errors.join("; ");
      if (typeof body.errors === "object" && body.errors) {
        return Object.entries(body.errors as Record<string, unknown>)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
          .join("; ");
      }
    }
  } catch {
    // not JSON — fall through
  }
  return text.slice(0, 300);
}

export interface PageInfo {
  page?: number;
  perPage?: number;
  total?: number;
}

function pageInfo(headers: Headers): PageInfo {
  const num = (v: string | null) => {
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    page: num(headers.get("x-page")),
    perPage: num(headers.get("x-per-page")),
    total: num(headers.get("x-total")),
  };
}

export interface ListResult<T> {
  items: T[];
  page: PageInfo;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime routes every request
 * through the auth `sign` hook.
 */
export class MocoClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(accountFromConnection(ctx.connection));
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): URL {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  private async send(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const detail = errorDetail(text);
      throw new Error(
        `MOCO ${res.status} ${res.statusText} for ${init.method} ${url.pathname}${
          detail ? `: ${detail}` : ""
        }`,
      );
    }
    return res;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * List endpoints paginate via `X-Page` / `X-Per-Page` / `X-Total` response headers (a `Link`
   * header with `rel="next"` also exists but the pagination fields the params already expose are
   * enough for a workflow to page manually).
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<ListResult<T>> {
    const res = await this.send(path, options);
    const text = await res.text();
    const items = text ? (JSON.parse(text) as T[]) : [];
    return { items, page: pageInfo(res.headers) };
  }
}
