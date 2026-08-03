import type { ActionDefinition } from "@w6w/types";
import { GristClient, type GristSqlResultSet } from "../lib/client.ts";

interface Input {
  docId: string;
  sql: string;
  args?: Array<string | number>;
  timeout?: number;
}

/**
 * `POST /docs/{docId}/sql`.
 *
 * Every Grist document *is* a SQLite database, and this endpoint runs a query
 * straight against it. That makes it the escape hatch for everything
 * `list-records` cannot express — joins across tables, aggregates, ranges,
 * `LIKE`, `LIMIT`/`OFFSET` paging — in one round trip instead of N.
 *
 * The constraints are Grist's, quoted from the endpoint's own description:
 *
 *  - "Must be a single SELECT statement, with no trailing semicolon."
 *  - "WITH clauses are permitted."
 *  - "Statements that would modify the database are not supported." It is
 *    read-only by construction, which is why this action is `type: "search"`
 *    and not a `perform`.
 *  - `timeout` "Defaults to 1000 (1 second)… The default cannot be exceeded,
 *    only reduced." Raising it above the server's `GRIST_SQL_TIMEOUT_MSEC` does
 *    nothing, so the hint says so rather than implying a knob that works.
 *
 * The POST form is used rather than `GET /sql?q=`, because only POST accepts
 * bound `args`. Interpolating a value into the statement instead is the
 * injection bug this action exists to avoid.
 */
const runSql: ActionDefinition<Input, GristSqlResultSet> = {
  key: "run-sql",
  type: "search",
  resource: "record",
  title: "Run SQL Query",
  description:
    "Run a read-only SELECT against the document's SQLite database, with bound parameters. Use for joins, aggregates and paging.",
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    {
      key: "sql",
      label: "SQL",
      type: "code",
      ui: "code:sql",
      required: true,
      placeholder: "select * from Pets where popularity >= ?",
      hint:
        "A single SELECT (WITH clauses allowed), no trailing semicolon. Table and column names are " +
        "the normalized IDs. Writes are rejected by the server.",
    },
    {
      key: "args",
      label: "Parameters",
      type: "array",
      item: { type: "string" },
      hint:
        "Values bound to each `?` in order. Always prefer these over string-concatenating a value " +
        "into the statement.",
    },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      advanced: true,
      hint:
        "Defaults to 1000 server-side. This can only LOWER that ceiling — a larger value is ignored.",
    },
  ],
  output: [
    { key: "statement", type: "string", label: "The statement, echoed back" },
    { key: "records", type: "array", label: "Result rows, each as { fields }" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    const body: Record<string, unknown> = { sql: input.sql };
    if (input.args && input.args.length > 0) body.args = input.args;
    if (input.timeout !== undefined && input.timeout !== null) body.timeout = input.timeout;

    return client.request<GristSqlResultSet>(
      `/docs/${encodeURIComponent(input.docId)}/sql`,
      { method: "POST", body },
    );
  },
};

export default runSql;
