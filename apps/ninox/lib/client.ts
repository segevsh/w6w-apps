import type { HookContext, Param, RedactedConnection } from "@w6w/types";

/**
 * Ninox 4 public API client.
 *
 * Verified on 2026-10-06 against the vendor's OpenAPI 3.0 document
 * (`https://go.ninox.com/api/docs-json`, `info.version` 1.0.0) and live probes against
 * `go.ninox.com`. The document declares no `servers`; the base is `https://go.ninox.com/api/v1`
 * (the prose docs point at `go.ninox.com/api/docs`, and the paths in the document start with
 * `/api/v1/workspace/{workspaceId}`).
 *
 * ## One key, one workspace
 *
 * "Each API Key is scoped to one workspace only", and every path begins with that workspace's
 * 12-character id. The id is therefore a Connection field: it is not secret, and `afterConnect`
 * echoes it onto the Connection's public `display`, which is where this client reads it.
 * Actions never see the key — the Auth `sign` hook stamps `Authorization: Bearer`.
 *
 * ## Response shapes
 *
 * Success is always `{ "data": … }`. Lists add `page_info: { has_more, limit, offset }`; the
 * change feeds add `meta.asOf`. Errors are documented as `{ "error": { "message" } }`, **but the
 * gateway in front of the API answers a missing or wrong key with a bare `text/plain` 401**
 * (`Workspace orchestrator error`, measured), and an unknown path under `/api/v1` answers
 * **200 with the Ninox web-app HTML shell**. So a body is judged by its shape, never by the
 * status line, and a 200 that is not JSON is an error here.
 */
export const API_BASE = "https://go.ninox.com";
export const API_PREFIX = "/api/v1";

/** Workspace ids are exactly 12 lowercase alphanumerics (`minLength`/`maxLength` 12, `^[a-z0-9]+$`). */
export const WORKSPACE_ID_PATTERN = /^[a-z0-9]{12}$/;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Public (redacted-safe) connection metadata this client depends on. */
export interface NinoxConnectionDisplay {
  workspaceId?: string;
}

export function resolveWorkspaceId(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as NinoxConnectionDisplay;
  const id = display.workspaceId?.trim();
  if (!id) {
    throw new Error("Ninox connection records no workspace id — reconnect so one can be recorded.");
  }
  return id;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Percent-encode one path segment. */
export function seg(value: unknown): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/** Accept a JSON string or an already-parsed value. Blank/undefined stays undefined. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** `records` for the batch write endpoints: a non-empty array of objects. */
export function asRecords(value: unknown): Array<Record<string, unknown>> {
  const records = asJson<unknown>(value, "records");
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("records must be a non-empty JSON array");
  }
  for (const r of records) {
    if (r === null || typeof r !== "object" || Array.isArray(r)) {
      throw new Error("every entry of records must be a JSON object");
    }
  }
  return records as Array<Record<string, unknown>>;
}

/**
 * Record ids are positive integers (`exclusiveMinimum: 0`, max 2^53-1). Accept an array or a
 * comma/space separated string and fail loudly on anything else — a silently dropped id in a
 * DELETE is a record that is still there.
 */
export function asIds(value: unknown, label = "recordIds"): number[] {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(/[\s,]+/);
  const items = raw.map((v) => String(v).trim()).filter((v) => v !== "");
  if (items.length === 0) throw new Error(`${label} must list at least one record id`);
  return items.map((s) => {
    const n = Number(s);
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`${label}: "${s}" is not a record id`);
    return n;
  });
}

export function asRecordId(value: unknown): number {
  const [id] = asIds([value], "recordId");
  return id;
}

/** Comma-separated string or array -> `a,b,c`, or undefined when empty. */
export function csv(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/** Render a short message from the vendor's error envelope, or the raw text when it has none. */
export function errorMessage(status: number, text: string): string {
  let message: string | undefined;
  try {
    message = (JSON.parse(text) as { error?: { message?: string } })?.error?.message;
  } catch {
    // not JSON — fall through to the text
  }
  const detail = message ?? (text.trimStart().startsWith("<") ? "" : text.trim().slice(0, 200));
  return `Ninox returned HTTP ${status}${detail ? `: ${detail}` : ""}`;
}

export const MODULE_PARAM: Param = {
  key: "moduleName",
  label: "Module name",
  type: "string",
  required: true,
  placeholder: "crm",
  hint:
    "The module's API name: lowercase letters, digits and underscores (list modules to see it).",
};

export const TABLE_PARAM: Param = {
  key: "tableName",
  label: "Table name",
  type: "string",
  required: true,
  hint: "The table's API name within the module.",
};

export const LIMIT_PARAM: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: 25,
  validation: { min: 1, max: 100, integer: true },
  hint: "Rows per page (the vendor accepts 1-100 on records and change feeds).",
};

export const OFFSET_PARAM: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  default: 0,
  validation: { min: 0, integer: true },
  hint: "Rows to skip. Continue while the result's `hasMore` is true.",
};

export interface PageInfo {
  has_more?: boolean;
  limit?: number;
  offset?: number;
}

export interface Envelope<T = unknown> {
  data?: T;
  meta?: Record<string, unknown>;
  page_info?: PageInfo;
}

export class NinoxClient {
  readonly workspaceId: string;

  constructor(private readonly ctx: HookContext) {
    this.workspaceId = resolveWorkspaceId(ctx.connection);
  }

  buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(
      `${API_BASE}${API_PREFIX}/workspace/${seg(this.workspaceId)}${path}`,
    );
    for (const [k, v] of Object.entries(compact(query ?? {}))) url.searchParams.set(k, String(v));
    return url.toString();
  }

  /** Perform a call and return the parsed `{data, meta, page_info}` envelope. */
  async call<T = unknown>(path: string, opts: RequestOptions = {}): Promise<Envelope<T>> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    const res = await this.ctx.fetch(this.buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(errorMessage(res.status, text));
    let parsed: Envelope<T> | null = null;
    try {
      parsed = text ? JSON.parse(text) as Envelope<T> : null;
    } catch {
      parsed = null;
    }
    if (parsed === null || typeof parsed !== "object" || !("data" in parsed)) {
      throw new Error(
        `Ninox returned HTTP ${res.status} without a {"data": …} body — not an API response`,
      );
    }
    return parsed;
  }

  /** Call and return the `data` member. */
  async data<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    return (await this.call<T>(path, opts)).data as T;
  }

  /** Call a list endpoint: `{ items, hasMore, limit, offset }`. */
  async list<T = unknown>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<{ items: T[]; hasMore: boolean; limit?: number; offset?: number }> {
    const env = await this.call<T[]>(path, { query });
    return {
      items: Array.isArray(env.data) ? env.data : [],
      hasMore: env.page_info?.has_more === true,
      limit: env.page_info?.limit,
      offset: env.page_info?.offset,
    };
  }

  tablePath(input: { moduleName: string; tableName: string }): string {
    return `/modules/${seg(input.moduleName)}/tables/${seg(input.tableName)}`;
  }
}
