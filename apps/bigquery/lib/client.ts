import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * BigQuery's REST API v2 — verified against the discovery document Google
 * serves from the API's own host
 * (`https://bigquery.googleapis.com/$discovery/rest?version=v2`, fetched
 * 2026-08-18), which states `baseUrl` as
 * `https://bigquery.googleapis.com/bigquery/v2/`.
 *
 * Note the shape of that base: the version lives in the **path**, not a header
 * or a query parameter, and the `bigquery/` segment is part of it. Every path
 * in this app is written relative to it.
 */
export const API_URL = "https://bigquery.googleapis.com/bigquery/v2";

/** Public (redacted-safe) connection metadata. */
export interface BigQueryConnectionDisplay {
  /** The Google Cloud project these actions bill and default to. */
  projectId?: string;
  /** The default dataset, when one was supplied. */
  datasetId?: string;
}

/**
 * Resolve the project: the action's override wins, else the connection's.
 *
 * **This is the project that gets billed**, not necessarily the one that owns
 * the data — a query can read a public dataset while the cost lands on yours.
 * That is why it is a connection field rather than something inferred.
 */
export function resolveProject(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as BigQueryConnectionDisplay;
  const fromConnection = display.projectId?.trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "no Google Cloud project — set one on the connection or pass `projectId` on the action",
  );
}

/** Resolve the dataset: the action's override wins, else the connection's. */
export function resolveDataset(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as BigQueryConnectionDisplay;
  const fromConnection = display.datasetId?.trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "no dataset — set a default on the connection or pass `datasetId` on the action",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a PATCH doesn't clear untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
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

/**
 * Turn BigQuery's row encoding into plain objects.
 *
 * This is the single most surprising thing about the API and the reason this
 * helper exists. A query does **not** return `[{name: "ada", age: 36}]`. It
 * returns a schema of field names alongside rows shaped like
 * `{f: [{v: "ada"}, {v: "36"}]}` — positional, with every scalar as a
 * **string**, `null` for NULL, a nested `{f: […]}` for a RECORD and an array of
 * `{v: …}` for a REPEATED field.
 *
 * Actions return that raw form *and* a decoded `rows` array, because a workflow
 * author almost always wants the latter and would otherwise write this zip by
 * hand in every step. Values are left as strings rather than coerced: BigQuery
 * returns INT64 as a string precisely because it does not fit a JSON number,
 * and silently turning it into one would lose precision.
 */
export interface BigQueryField {
  name?: string;
  type?: string;
  mode?: string;
  fields?: BigQueryField[];
}

interface Cell {
  v?: unknown;
}

function decodeValue(field: BigQueryField | undefined, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  // REPEATED: an array of cells, each holding one element.
  if (field?.mode === "REPEATED" && Array.isArray(value)) {
    return value.map((cell) => decodeValue({ ...field, mode: undefined }, (cell as Cell)?.v));
  }
  // RECORD / STRUCT: a nested row.
  if (
    (field?.type === "RECORD" || field?.type === "STRUCT") && value && typeof value === "object"
  ) {
    return decodeRow(field.fields ?? [], value as { f?: Cell[] });
  }
  return value;
}

/** Zip one `{f: [{v}]}` row against the schema's field list. */
export function decodeRow(
  fields: BigQueryField[],
  row: { f?: Cell[] } | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const cells = row?.f ?? [];
  fields.forEach((field, i) => {
    out[field.name ?? `f${i}`] = decodeValue(field, cells[i]?.v);
  });
  return out;
}

/** Decode a whole result set. Returns `undefined` when there is no schema. */
export function decodeRows(
  schema: { fields?: BigQueryField[] } | undefined,
  rows: Array<{ f?: Cell[] }> | undefined,
): Array<Record<string, unknown>> | undefined {
  if (!schema?.fields || !rows) return undefined;
  return rows.map((row) => decodeRow(schema.fields!, row));
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class BigQueryClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Google's error envelope is `{ "error": { "code", "message", "errors":
      // [{ "reason" }] } }`. The `reason` is the machine-readable part —
      // `notFound`, `accessDenied`, `quotaExceeded`, `invalidQuery` — and the
      // message carries the SQL error, so both are surfaced.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `BigQuery ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Google's `pageToken` pagination, collecting one named collection.
   * The token is absent on the last page.
   */
  async requestAll<T = unknown>(
    path: string,
    collectionKey: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let pageToken: string | undefined;
    while (items.length < wantTotal) {
      // Ask for what is still wanted, capped at BigQuery's page maximum — a
      // caller who wants 10 rows should not pull 1000 across the wire.
      const pageSize = Math.min(1000, Math.max(1, wantTotal - items.length));
      const page = await this.request<Record<string, unknown>>(path, {
        ...options,
        query: { ...options.query, maxResults: pageSize, pageToken },
      });
      const chunk = (page?.[collectionKey] as T[] | undefined) ?? [];
      items.push(...chunk);
      pageToken = page?.nextPageToken as string | undefined;
      if (!pageToken || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
