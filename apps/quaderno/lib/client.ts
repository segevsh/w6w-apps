import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Quaderno gives every account its own host — `acme.quadernoapp.com` — so the
 * manifest declares `*.quadernoapp.com` (the wildcard does not match the
 * apex). The account name belongs to the Connection: `afterConnect` records it
 * on the connection's redacted `display`, and this client reads it from there,
 * never from an Action param and never near the credential.
 */
export function accountFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { account?: string };
  if (display.account) return display.account;
  throw new Error(
    "Quaderno connection has no account — reconnect so the account name can be recorded.",
  );
}

export function baseUrl(account: string): string {
  return `https://${account}.quadernoapp.com/api`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

export interface ListPage<T = unknown> {
  items: T[];
  hasMore: boolean;
  /** Pass this as `createdBefore` to fetch the next page (the last item's id). */
  nextCursor?: number;
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
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a JSON object/array directly, or a JSON string of one. */
export function jsonParam<T = unknown>(raw: unknown, name: string): T | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`\`${name}\` is not valid JSON.`);
  }
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class QuadernoClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(accountFromConnection(ctx.connection));
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Errors are `{ "error": "..." }` (and field-keyed arrays on 422) — the
      // body is where the actionable part is.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Quaderno ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    return res;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  /**
   * A list endpoint. Pagination is cursor-style: `created_before=<id>` plus
   * the `X-Pages-HasMore` response header (the body is a bare array).
   */
  async list<T = unknown>(
    path: string,
    query: Record<string, string | number | boolean | undefined | null>,
  ): Promise<ListPage<T>> {
    const res = await this.send(path, { query });
    const text = await res.text();
    const items = (text ? JSON.parse(text) : []) as T[];
    const hasMore = res.headers.get("x-pages-hasmore") === "true";
    const last = items[items.length - 1] as { id?: number } | undefined;
    return { items, hasMore, nextCursor: hasMore ? last?.id : undefined };
  }
}
