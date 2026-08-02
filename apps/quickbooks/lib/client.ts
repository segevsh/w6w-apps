import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * QuickBooks Online Accounting API v3.
 *
 * Every request is scoped to one company ("realm") by a `realmId` segment in
 * the path — `/v3/company/{realmId}/...` — unlike Xero, where the tenant
 * distinction is a header on an otherwise-fixed host. That makes this closer
 * to Jira's `baseFromConnection` shape (a per-connection base URL) than to
 * Xero's fixed `API_URL` constant, even though both are "one App, one
 * external tenant concept".
 *
 * **Where `realmId` comes from.** Intuit's OAuth callback appends it to the
 * redirect as a `realmId` query parameter alongside `code` — it is not
 * discoverable from any "list accessible companies" endpoint the way Xero's
 * tenants or Jira's cloud ids are (QuickBooks Online OAuth authorises exactly
 * one company per grant). The generic `ExchangeHook` contract
 * (`{ fields?, code?, redirectUri? }`, hook-runtime RFC) has no slot for an
 * extra provider-appended callback parameter, and this host's `/oauth/callback`
 * currently reads only `code`/`state`/`error` from the query string — so
 * there is no path today for `realmId` to reach `afterConnect` or `sign`
 * automatically. Until a host learns to forward extra callback params, this
 * app collects `realmId` as a connect-time field instead (see
 * `auth/oauth2.ts`), the same escape hatch Zendesk's `subdomain` and
 * ServiceNow's `instance` use for a value their `sign` hook needs but their
 * OAuth flow alone doesn't supply.
 */
export const API_HOST = "quickbooks.api.intuit.com";

/**
 * Intuit deprecated minor versions 1–74 in August 2025; every request now
 * resolves to 75 regardless of what (if anything) it asks for, so this pins
 * it explicitly rather than relying on the server-side default.
 */
export const MINOR_VERSION = "75";

export function baseFromConnection(connection: RedactedConnection | undefined): string {
  const { realmId } = (connection?.display ?? {}) as { realmId?: string };
  if (!realmId) {
    throw new Error(
      "QuickBooks connection has no realmId (Company ID) recorded — reconnect and supply it.",
    );
  }
  return `https://${API_HOST}/v3/company/${realmId}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Drop keys the caller left unset so a sparse update doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Parse the "Additional fields" / "Fields" JSON params into a plain object.
 * Rejects anything that is not an object, so a typo fails here rather than as
 * an opaque 400 from QuickBooks.
 */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Parse the "Line items" JSON param into an array. Rejects anything that is
 * not an array, so a typo fails here rather than as an opaque 400 from
 * QuickBooks.
 */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

/**
 * Build a query-endpoint statement: `SELECT * FROM <entity> [WHERE ...]
 * [ORDERBY ...] STARTPOSITION n MAXRESULTS m`. QuickBooks has no dedicated
 * "list" endpoint per entity — every list/search goes through the shared
 * `/query` resource with this SQL-like syntax
 * (developer.intuit.com/.../data-queries).
 */
export function buildQuery(
  entity: string,
  opts: { where?: string; orderBy?: string; startPosition?: number; maxResults?: number } = {},
): string {
  let q = `SELECT * FROM ${entity}`;
  if (opts.where) q += ` WHERE ${opts.where}`;
  if (opts.orderBy) q += ` ORDERBY ${opts.orderBy}`;
  q += ` STARTPOSITION ${opts.startPosition ?? 1}`;
  // QuickBooks caps a single query page at 1000; 100 matches the API's own default.
  q += ` MAXRESULTS ${opts.maxResults ?? 100}`;
  return q;
}

interface QuickBooksErrorEntry {
  Message?: string;
  Detail?: string;
  code?: string;
}
interface QuickBooksErrorBody {
  Fault?: { Error?: QuickBooksErrorEntry[]; type?: string };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which injects it.
 */
export class QuickBooksClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    url.searchParams.set("minorversion", MINOR_VERSION);
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
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        // QuickBooks nests the actionable message under Fault.Error[] rather
        // than a top-level Message.
        const body = JSON.parse(text) as QuickBooksErrorBody;
        const errors = body.Fault?.Error
          ?.map((e) => [e.Message, e.Detail].filter(Boolean).join(" — "))
          .filter(Boolean);
        detail = errors?.length ? errors.join("; ") : text;
      } catch { /* keep the raw body */ }
      throw new Error(`QuickBooks ${res.status} for ${init.method} ${url.pathname}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Runs a `/query` statement built by `buildQuery` and returns the raw envelope. */
  query<T = unknown>(entity: string, opts: Parameters<typeof buildQuery>[1] = {}): Promise<T> {
    return this.request<T>("/query", { query: { query: buildQuery(entity, opts) } });
  }
}
