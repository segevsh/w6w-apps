import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * ClickHouse — two APIs, and the second one is the reason this app exists.
 *
 * ## The `databases` slug, and what could actually be built for it
 *
 * The category RFC names Postgres, MySQL and MongoDB. **None of them can be an
 * HTTP app**: they speak binary wire protocols over their own ports, so a
 * workflow can manage them (see `apps/mongodb-atlas`, which is a control plane
 * and says so) and cannot query them.
 *
 * ClickHouse is the exception. Its **native interface is HTTP** — `POST /` with
 * SQL in the body — so this is the one app in the slug that can actually run a
 * query and return rows. That is the whole reason it was chosen.
 *
 * So there are two planes, with two different credentials:
 *
 * | Plane | Host | Credential | What it does |
 * | --- | --- | --- | --- |
 * | Control | `api.clickhouse.cloud` | organisation key id + secret | services, scaling, backups, billing |
 * | Query | the service's own host | database user + password | SQL |
 *
 * A connection holds one or the other. The actions say which they need rather
 * than failing obscurely.
 *
 * ## The HTTP status is derived from ClickHouse's error code, and misleads
 *
 * Measured live against `play.clickhouse.com` on 2026-08-19:
 *
 * | SQL problem | ClickHouse code | HTTP |
 * | --- | --- | --- |
 * | `SELECT 1 +` | 62 `SYNTAX_ERROR` | **400** |
 * | unknown table | 60 `UNKNOWN_TABLE` | **404** |
 * | unknown column | 47 `UNKNOWN_IDENTIFIER` | **404** |
 * | forbidden statement | 497 `ACCESS_DENIED` | **403** |
 *
 * So a **404 from a query means a typo in a table or column name**, not a wrong
 * URL, and a **403 means the SQL was refused**, not that the credential is bad.
 * A client with ordinary HTTP error handling — retry a 5xx, re-authenticate on
 * a 403, report a 404 as "not found" — draws the wrong conclusion from all
 * three. The real code is in `X-ClickHouse-Exception-Code`, and this app reads
 * it rather than the status.
 */

/** The control plane. One host, not regional. */
export const API_HOST = "https://api.clickhouse.cloud";

/** Public (redacted-safe) connection metadata. */
export interface ClickHouseConnectionDisplay {
  /** Control-plane connections: the organisation this key belongs to. */
  organizationId?: string;
  organizationName?: string;
  /** Query connections: the service's HTTPS endpoint. */
  host?: string;
  /** Query connections: the database user. */
  username?: string;
  /** Which plane this connection can reach. */
  plane?: "control" | "query";
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop keys the caller left unset, so a default is not overwritten with nothing. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** `compact`, but an object with nothing left in it is left out entirely. */
export function emptyToUndefined(
  obj: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const compacted = compact(obj);
  return Object.keys(compacted).length ? compacted : undefined;
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

/** Coerce a params bag into query values, dropping what was left unset. */
export function query(input: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "boolean" || typeof v === "number" ? v : String(v);
  }
  return out;
}

/** A UUID, which is what ClickHouse Cloud uses for every id. */
export function uuid(value: unknown, field: string): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required`);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(
      `\`${field}\` must be a UUID — got "${id}". ClickHouse Cloud identifies organisations and ` +
        "services by UUID, not by name; `organization-list` and `service-list` report them",
    );
  }
  return id;
}

/**
 * The organisation this connection's key belongs to.
 *
 * Every control-plane path begins with it, and a key belongs to exactly one
 * organisation — so it is recorded at connect time rather than asked for on
 * every action.
 */
export function organizationFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as ClickHouseConnectionDisplay;
  const id = String(display.organizationId ?? "").trim();
  if (!id) {
    throw new Error(
      "this connection has no organisation recorded. That usually means it is a SERVICE " +
        "connection, which reaches the query interface rather than the control plane — the " +
        "actions that manage services need an organisation API key instead",
    );
  }
  return id;
}

/** Refuse a control-plane action on a query connection, with the reason. */
export function requireControlPlane(ctx: HookContext): string {
  return organizationFromConnection(ctx.connection);
}

/**
 * Thin wrapper over `ctx.fetch` for the control plane. It never sets the key —
 * the runtime routes every request through the auth `sign` hook.
 */
export class CloudClient {
  readonly organizationId: string;

  constructor(private ctx: HookContext, organizationId?: string) {
    this.organizationId = organizationId ?? organizationFromConnection(ctx.connection);
  }

  /** A path relative to the organisation, e.g. `/services`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_HOST}/v1/organizations/${this.organizationId}${path}`);
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
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `ClickHouse Cloud ${res.status} for ${init.method} ${url.pathname}: ${
          describeCloudError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;

    // The control plane wraps everything in {result, status, requestId}.
    const body = JSON.parse(text) as { result?: T };
    return (
      Object.prototype.hasOwnProperty.call(body, "result") ? body.result : body
    ) as T;
  }
}

/**
 * Turn a control-plane error into something actionable.
 *
 * The shape is `{"error": "…", "status": 401, "requestId": "…"}` — the
 * requestId is what ClickHouse support asks for, so it is kept.
 */
export function describeCloudError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  let requestId = "";
  try {
    const body = JSON.parse(text) as { error?: string; requestId?: string };
    detail = body?.error || detail;
    requestId = String(body?.requestId ?? "");
  } catch { /* not JSON */ }
  const tail = requestId ? ` (requestId ${requestId})` : "";

  if (status === 401) {
    return `${detail}${tail} — the API key was not accepted. A ClickHouse Cloud key is a key ID ` +
      "and a key SECRET sent as HTTP Basic, and the secret is shown once at creation";
  }
  if (status === 403) {
    return `${detail}${tail} — the key authenticated and is not permitted. Keys carry a role, ` +
      "and a read-only key succeeds on every list and fails on every change";
  }
  if (status === 404) {
    return `${detail}${tail} — not found. Organisations and services are identified by UUID, so ` +
      "a name used where an id belongs looks exactly like this";
  }
  if (status === 409) {
    return `${detail}${tail} — a conflict. A service that is starting, stopping or already in ` +
      "the requested state refuses the change rather than queueing it";
  }
  if (status === 429) {
    return `${detail}${tail} — rate limited on the control plane. This is separate from anything ` +
      "the query interface enforces";
  }
  return `${detail}${tail}` || `${status}`;
}
