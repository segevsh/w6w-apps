import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Every Snowflake account is its own host — `<account_identifier>.snowflakecomputing.com`.
 * A manifest cannot enumerate those, so `w6w.network.allow` declares the wildcard
 * `*.snowflakecomputing.com`; the runtime's egress matcher accepts any subdomain
 * of it while still refusing everything else.
 *
 * The identifier itself lives on the Connection (recorded by the auth method's
 * `afterConnect`), not as an Action param — it identifies the account the same
 * way Zendesk's subdomain does.
 */
export function accountFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { account?: string };
  if (display.account) return display.account;
  throw new Error(
    "Snowflake connection has no account — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(account: string): string {
  return `https://${account}.snowflakecomputing.com`;
}

export const STATEMENTS_PATH = "/api/v2/statements";

/** Drop keys the caller left unset, so we never send `""`/`undefined` as a literal value. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export interface SubmitStatementBody {
  statement: string;
  timeout?: number;
  database?: string;
  schema?: string;
  warehouse?: string;
  role?: string;
  /** `{ "1": { type: "FIXED", value: "42" } }` — positional bind variables. */
  bindings?: Record<string, { type: string; value: unknown }>;
}

export interface ResultSetColumn {
  name: string;
  type?: string;
  nullable?: boolean;
}

export interface ResultSetMetaData {
  numRows?: number;
  format?: string;
  rowType?: ResultSetColumn[];
  partitionInfo?: Array<{ rowCount?: number; uncompressedSize?: number }>;
}

/** The SQL API's response envelope, shared by the submit and get-status endpoints. */
export interface StatementResponseBody {
  statementHandle?: string;
  statementStatusUrl?: string;
  message?: string;
  code?: string;
  sqlState?: string;
  resultSetMetaData?: ResultSetMetaData;
  data?: unknown[][];
  createdOn?: number;
}

/**
 * `complete` — HTTP 200, `data` is the full result.
 * `running` — HTTP 202 (still executing past the ~45s synchronous window, or
 * `?async=true` forced an immediate handle) or, for the get-status endpoint
 * only, HTTP 429 — Snowflake's documented alternate "still executing" code
 * for that one endpoint.
 */
export type StatementStatus = "complete" | "running";

export interface StatementResult {
  status: StatementStatus;
  httpStatus: number;
  body: StatementResponseBody;
  /** `body.data` reshaped into `{ column: value }` records using `resultSetMetaData.rowType`. */
  rows: Array<Record<string, unknown>>;
}

/** Raised for any non-2xx/202/429 response. Carries Snowflake's own `code`/`sqlState`/`message`. */
export class SnowflakeApiError extends Error {
  constructor(public httpStatus: number, public body: StatementResponseBody | undefined) {
    super(
      `Snowflake SQL API returned ${httpStatus}${body?.code ? ` (code ${body.code})` : ""}: ${
        body?.message ?? "no error message in response body"
      }`,
    );
    this.name = "SnowflakeApiError";
  }
}

/** Single-quote a value for inline SQL, doubling embedded quotes — the standard SQL escape. */
export function sqlStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Reshape `data` (an array of column-position arrays) into named-column records. */
export function rowsAsObjects(
  meta: ResultSetMetaData | undefined,
  data: unknown[][] | undefined,
): Array<Record<string, unknown>> {
  const rowType = meta?.rowType;
  if (!rowType || !Array.isArray(data)) return [];
  return data.map((row) => {
    const record: Record<string, unknown> = {};
    rowType.forEach((col, i) => {
      record[col.name] = row[i];
    });
    return record;
  });
}

/**
 * Thin wrapper over `ctx.fetch` for the Snowflake SQL API v2. Never sets
 * `Authorization` itself — the runtime routes every call through the
 * `key-pair` auth method's `sign` hook, which mints a fresh JWT per request.
 */
export class SnowflakeClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(accountFromConnection(ctx.connection));
  }

  /** `POST /api/v2/statements` — submit a SQL statement for execution. */
  async submitStatement(
    body: SubmitStatementBody,
    opts: { runAsync?: boolean } = {},
  ): Promise<StatementResult> {
    const url = new URL(`${this.base}${STATEMENTS_PATH}`);
    if (opts.runAsync) url.searchParams.set("async", "true");
    const res = await this.ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(compact(body as unknown as Record<string, unknown>)),
    });
    return await this.parse(res, { treatTooManyAsRunning: false });
  }

  /** `GET /api/v2/statements/{handle}` — poll status / fetch results. */
  async getStatement(
    handle: string,
    opts: { partition?: number } = {},
  ): Promise<StatementResult> {
    const url = new URL(`${this.base}${STATEMENTS_PATH}/${encodeURIComponent(handle)}`);
    if (opts.partition !== undefined) url.searchParams.set("partition", String(opts.partition));
    const res = await this.ctx.fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/json" },
    });
    // Snowflake documents 429 as this endpoint's alternate "still executing"
    // code (alongside 202) — distinct from the submit endpoint, where 429
    // means real throttling.
    return await this.parse(res, { treatTooManyAsRunning: true });
  }

  /** `POST /api/v2/statements/{handle}/cancel` — cancel a running statement. */
  async cancelStatement(handle: string): Promise<{ success: boolean; message?: string }> {
    const url = `${this.base}${STATEMENTS_PATH}/${encodeURIComponent(handle)}/cancel`;
    const res = await this.ctx.fetch(url, {
      method: "POST",
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) as { success?: boolean; message?: string } : {};
    if (!res.ok) throw new SnowflakeApiError(res.status, parsed);
    return { success: parsed.success ?? true, message: parsed.message };
  }

  private async parse(
    res: Response,
    opts: { treatTooManyAsRunning: boolean },
  ): Promise<StatementResult> {
    const text = await res.text();
    const body = (text ? JSON.parse(text) : {}) as StatementResponseBody;

    if (res.status === 200) {
      return {
        status: "complete",
        httpStatus: res.status,
        body,
        rows: rowsAsObjects(body.resultSetMetaData, body.data),
      };
    }
    if (res.status === 202 || (opts.treatTooManyAsRunning && res.status === 429)) {
      return { status: "running", httpStatus: res.status, body, rows: [] };
    }
    throw new SnowflakeApiError(res.status, body);
  }
}
