import type { HookContext, RedactedConnection } from "@w6w/types";
import type { ClickHouseConnectionDisplay } from "./client.ts";

/**
 * The native HTTP interface — the part of ClickHouse that other databases in
 * this category do not have.
 *
 * `POST https://{host}:8443/?…` with SQL in the body. No driver, no wire
 * protocol, no connection pool: one request, one result.
 *
 * ## `FORMAT JSON` is what makes the result readable
 *
 * ClickHouse's default output is `TabSeparated` — no column names, no types,
 * nothing to distinguish an empty string from a null. Asking for
 * `default_format=JSON` returns `{meta, data, rows, statistics}`, where `meta`
 * carries each column's declared ClickHouse type. That is worth more than it
 * looks: `UInt64` values arrive as **strings** in JSON because they do not fit
 * a double, so knowing the declared type is how a caller knows whether a string
 * is a string.
 *
 * ## Errors can arrive mid-response, and the defence is a query parameter
 *
 * ClickHouse streams results as it produces them. If a query fails after output
 * has begun, the bytes already sent are already sent — the documented behaviour
 * is a 200 with partial data and an exception appended to the body, which JSON
 * parsing then fails on for the wrong reason.
 *
 * `wait_end_of_query=1` buffers the response server-side so the status code is
 * decided before anything is sent. This app sets it on every query. (The
 * managed demo server this was probed against already buffers, so the partial
 * case was not reproduced there — the setting is applied because ClickHouse
 * documents the behaviour, not because it was observed.)
 *
 * ## `X-ClickHouse-Summary` is the cost of the query
 *
 * Measured: `{"read_rows":"1","read_bytes":"1","result_rows":"0",
 * "elapsed_ns":"899743","memory_usage":"1147327"}`. On a columnar database
 * scanning a billion rows to answer a question is normal and cheap, and
 * scanning a billion rows to answer a question that should have touched a
 * thousand is the bug. Nothing about the result itself distinguishes them, so
 * every query action returns these.
 *
 * ## Every number in it is a string
 *
 * Including `read_rows`. They are 64-bit counters serialised as JSON strings
 * for the same reason `UInt64` columns are.
 */

/** ClickHouse Cloud's HTTPS port. */
export const DEFAULT_PORT = 8443;

/** What a query cost, from `X-ClickHouse-Summary`. */
export interface QuerySummary {
  readRows?: number;
  readBytes?: number;
  writtenRows?: number;
  writtenBytes?: number;
  resultRows?: number;
  elapsedMs?: number;
  memoryUsageBytes?: number;
}

/** A column, as ClickHouse declares it. */
export interface QueryColumn {
  name: string;
  type: string;
}

export interface QueryResult {
  rows: Array<Record<string, unknown>>;
  columns: QueryColumn[];
  rowCount: number;
  summary: QuerySummary;
  queryId?: string;
}

/**
 * Normalise a service host into an origin.
 *
 * ClickHouse Cloud publishes `{id}.{region}.{cloud}.clickhouse.cloud` and the
 * HTTPS interface is on **8443**, not 443. A URL without the port reaches
 * nothing, which is the first thing to go wrong when somebody pastes the
 * hostname out of the console.
 */
export function normalizeHost(raw: unknown): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("a ClickHouse service host is required");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`the ClickHouse host is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`the ClickHouse host has no hostname: ${trimmed}`);
  const port = url.port || String(DEFAULT_PORT);
  return `${url.protocol}//${url.hostname}:${port}`;
}

/** The service endpoint for this connection. */
export function hostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as ClickHouseConnectionDisplay;
  const host = String(display.host ?? "").trim();
  if (!host) {
    throw new Error(
      "this connection has no ClickHouse service host recorded. That usually means it is an " +
        "organisation API KEY connection, which reaches the control plane rather than the query " +
        "interface — running SQL needs a service connection with a database user and password",
    );
  }
  return normalizeHost(host);
}

/** Every number in the summary is a string; these are the ones worth having. */
export function parseSummary(raw: string | null): QuerySummary {
  if (!raw) return {};
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
  const num = (key: string) => {
    const value = Number(parsed[key]);
    return Number.isFinite(value) ? value : undefined;
  };
  const elapsedNs = num("elapsed_ns");
  return {
    readRows: num("read_rows"),
    readBytes: num("read_bytes"),
    writtenRows: num("written_rows"),
    writtenBytes: num("written_bytes"),
    resultRows: num("result_rows"),
    elapsedMs: elapsedNs === undefined ? undefined : elapsedNs / 1_000_000,
    memoryUsageBytes: num("memory_usage"),
  };
}

/**
 * A ClickHouse exception, as it comes back.
 *
 * The body starts `Code: 60. DB::Exception: …` and ends with the symbolic name
 * in parentheses — `(UNKNOWN_TABLE)`. The numeric code is also in
 * `X-ClickHouse-Exception-Code`, which is the reliable place because the body
 * may be a partial result with the exception appended.
 */
export function parseException(
  body: string,
  headerCode: string | null,
): { code?: number; name?: string; message: string } {
  const code = headerCode ? Number(headerCode) : Number(body.match(/^Code:\s*(\d+)/)?.[1]);
  const name = body.match(/\(([A-Z][A-Z0-9_]+)\)/)?.[1];
  const message = body.match(/DB::Exception:\s*([\s\S]*?)(?:\s*\(version|$)/)?.[1]?.trim() ||
    body.slice(0, 300);
  return {
    code: Number.isFinite(code) ? code : undefined,
    name,
    message,
  };
}

/**
 * Explain a query failure, including why the HTTP status is not what it seems.
 *
 * Measured mappings: SYNTAX_ERROR → 400, UNKNOWN_TABLE → 404,
 * UNKNOWN_IDENTIFIER → 404, ACCESS_DENIED → 403.
 */
export function describeQueryError(
  status: number,
  body: string,
  headerCode: string | null,
): string {
  const { code, name, message } = parseException(body, headerCode);
  const label = name ? `${name} (${code})` : code !== undefined ? `code ${code}` : `HTTP ${status}`;

  let hint = "";
  if (status === 404) {
    hint = " — note this 404 is a SQL error, not a wrong URL: ClickHouse maps UNKNOWN_TABLE and " +
      "UNKNOWN_IDENTIFIER onto 404, so it means a table or column name that does not exist";
  } else if (status === 403) {
    hint = " — note this 403 is a SQL error, not a bad credential: ACCESS_DENIED maps onto 403, " +
      "so the user authenticated and is not allowed to run this statement";
  } else if (status === 400) {
    hint = " — a syntax error, mapped onto 400";
  } else if (status === 401) {
    hint = " — the database user or password was not accepted. This is the service's own user, " +
      "not the organisation API key";
  }

  return `${label}: ${message}${hint}`;
}

/**
 * Run SQL over the HTTP interface. It never sets the credential — the runtime
 * routes every request through the auth `sign` hook.
 */
export class QueryClient {
  readonly host: string;

  constructor(private ctx: HookContext, host?: string) {
    this.host = host ?? hostFromConnection(ctx.connection);
  }

  /**
   * Run a statement and return rows.
   *
   * `settings` are ClickHouse query settings, passed as query-string
   * parameters — which is how the HTTP interface takes them.
   */
  async run(
    sql: string,
    options: {
      database?: string;
      settings?: Record<string, QueryValueLike>;
      /** Omit the JSON format for a statement that returns nothing. */
      raw?: boolean;
    } = {},
  ): Promise<QueryResult & { raw: string }> {
    const url = new URL(`${this.host}/`);
    if (!options.raw) url.searchParams.set("default_format", "JSON");
    if (options.database) url.searchParams.set("database", options.database);
    // Buffer server-side so the status is decided before anything is sent.
    url.searchParams.set("wait_end_of_query", "1");
    for (const [name, value] of Object.entries(options.settings ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(name, String(value));
    }

    const res = await this.ctx.fetch(url.toString(), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "text/plain; charset=utf-8" },
      body: sql,
    });
    const text = await res.text().catch(() => "");
    const summary = parseSummary(res.headers.get("x-clickhouse-summary"));
    const queryId = res.headers.get("x-clickhouse-query-id") ?? undefined;

    if (!res.ok) {
      throw new Error(
        `ClickHouse ${
          describeQueryError(
            res.status,
            text,
            res.headers.get("x-clickhouse-exception-code"),
          )
        }`,
      );
    }

    if (options.raw || !text.trim()) {
      return { rows: [], columns: [], rowCount: 0, summary, queryId, raw: text };
    }

    let parsed: {
      meta?: Array<{ name?: string; type?: string }>;
      data?: Array<Record<string, unknown>>;
      rows?: number;
    };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      throw new Error(
        "ClickHouse did not return parseable JSON. When a query fails after output has already " +
          "started, the response is partial data with an exception appended — this app sets " +
          `wait_end_of_query=1 to prevent that, so seeing it here is unexpected: ${
            text.slice(0, 200)
          }`,
      );
    }

    const rows = parsed?.data ?? [];
    return {
      rows,
      columns: (parsed?.meta ?? []).map((column) => ({
        name: String(column?.name ?? ""),
        // The declared ClickHouse type — how a caller knows a string is a
        // string rather than a UInt64 that would not fit a double.
        type: String(column?.type ?? ""),
      })),
      rowCount: typeof parsed?.rows === "number" ? parsed.rows : rows.length,
      summary,
      queryId,
      raw: text,
    };
  }
}

type QueryValueLike = string | number | boolean | undefined | null;
