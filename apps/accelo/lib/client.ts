import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Accelo gives every customer its own API host — `{deployment}.api.accelo.com`
 * (verified live 2026-10-06: an unknown deployment answers `400 Deployment 'x'
 * was not found.`, a real one such as `accelo` answers a schema-correct `401`).
 * A manifest cannot enumerate those, so `w6w.network.allow` declares
 * `*.api.accelo.com`, which the runtime matches against any subdomain while
 * still refusing everything else (the apex `api.accelo.com` only serves the docs).
 *
 * The deployment is an Auth field, not an Action param: it identifies the
 * account, so it belongs to the Connection. `afterConnect` records it on the
 * connection's redacted `display`, and this client reads it from there — it
 * never sees a credential.
 */
export const API_HOST_SUFFIX = ".api.accelo.com";

/** Deployment names are DNS labels; refuse anything that could redirect the host. */
export const DEPLOYMENT_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

export function normalizeDeployment(raw: string): string {
  // Accept a pasted host or URL, keep just the leading label.
  const cleaned = raw.trim().replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  const label = cleaned.endsWith(API_HOST_SUFFIX)
    ? cleaned.slice(0, -API_HOST_SUFFIX.length)
    : cleaned;
  if (!DEPLOYMENT_PATTERN.test(label)) {
    throw new Error(
      "Deployment must be just the subdomain from `{deployment}.api.accelo.com` (letters, digits, hyphens).",
    );
  }
  return label;
}

export function hostFor(deployment: string): string {
  return `https://${deployment}${API_HOST_SUFFIX}`;
}

export function apiBase(deployment: string): string {
  return `${hostFor(deployment)}/api/v0`;
}

export function oauthBase(deployment: string): string {
  return `${hostFor(deployment)}/oauth2/v0`;
}

export function deploymentFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { deployment?: string };
  if (display.deployment) return display.deployment;
  throw new Error(
    "Accelo connection has no deployment — reconnect the account so it can be recorded.",
  );
}

export type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar>;
  /** Sent `application/x-www-form-urlencoded` — the form every Accelo write example uses. */
  form?: Record<string, Scalar>;
  /** Sent `application/json` — used where the docs show a nested body (activity interactions). */
  json?: Record<string, unknown>;
}

/** Accelo's envelope: every JSON answer is `{ meta, response }`. */
export interface Envelope<T = unknown> {
  meta?: { status?: string; message?: string; more_info?: string };
  response?: T;
}

/** Drop keys the caller left unset so a PUT doesn't blank untouched fields. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** The standard list query: `_page` (0-based), `_limit` (max 100), `_search`, `_fields`, `_filters`. */
export interface ListInput {
  page?: number;
  limit?: number;
  search?: string;
  fields?: string;
  filters?: string;
  orderBy?: string;
  orderDirection?: string;
}

export function listQuery(input: ListInput): Record<string, Scalar> {
  const filters: string[] = [];
  if (input.filters?.trim()) filters.push(input.filters.trim());
  if (input.orderBy?.trim()) {
    const dir = input.orderDirection === "desc" ? "desc" : "asc";
    filters.push(`order_by_${dir}(${input.orderBy.trim()})`);
  }
  return {
    _page: input.page ?? 0,
    _limit: input.limit ?? 50,
    _search: input.search?.trim() || undefined,
    _fields: input.fields?.trim() || undefined,
    _filters: filters.length ? filters.join(",") : undefined,
  };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class AcceloClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = apiBase(deploymentFromConnection(ctx.connection));
  }

  /** Issue a request and return the unwrapped `response` member of the envelope. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    } else if (options.form !== undefined) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        body.set(k, String(v));
      }
      init.body = body.toString();
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let parsed: Envelope<T> | undefined;
    try {
      parsed = text ? JSON.parse(text) as Envelope<T> : undefined;
    } catch {
      parsed = undefined;
    }

    // Accelo answers real HTTP statuses, but the vendor's own `meta.status` is the
    // discriminator (a 400 can be `invalid_request` or `duplicate`), so report it.
    const status = parsed?.meta?.status;
    if (!res.ok || (status !== undefined && status !== "ok")) {
      throw new Error(describeFailure(res.status, method, url.pathname, parsed, text));
    }
    return parsed?.response as T;
  }

  /** A list endpoint: returns the page of items plus the paging that produced it. */
  async list<T = unknown>(
    path: string,
    input: ListInput,
    extra: Record<string, Scalar> = {},
  ): Promise<ListResult<T>> {
    const query = { ...listQuery(input), ...extra };
    const response = await this.request<T[] | null>(path, { query });
    const items = Array.isArray(response) ? response : [];
    const limit = Number(query._limit);
    return {
      items,
      page: Number(query._page),
      limit,
      hasMore: items.length >= limit,
    };
  }
}

export interface ListResult<T = unknown> {
  items: T[];
  page: number;
  limit: number;
  /** True when the page came back full, so another page may exist. */
  hasMore: boolean;
}

export function describeFailure(
  httpStatus: number,
  method: string,
  pathname: string,
  parsed: Envelope | undefined,
  raw: string,
): string {
  const code = parsed?.meta?.status;
  const message = parsed?.meta?.message ?? (raw.slice(0, 300) || "no response body");
  return `Accelo ${httpStatus}${code ? ` ${code}` : ""} for ${method} ${pathname}: ${message}`;
}
