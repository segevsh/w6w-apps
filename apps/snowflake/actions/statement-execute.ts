import type { ActionDefinition } from "@w6w/types";
import { compact, SnowflakeClient, type SubmitStatementBody } from "../lib/client.ts";

interface Input {
  statement: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
  timeout?: number;
  runAsync?: boolean;
  bindings?: unknown;
}

interface Output {
  statementHandle?: string;
  status: string;
  message?: string;
  code?: string;
  sqlState?: string;
  resultSetMetaData?: unknown;
  data?: unknown;
  rows: Array<Record<string, unknown>>;
}

const statementExecute: ActionDefinition<Input, Output> = {
  key: "statement-execute",
  type: "perform",
  resource: "statement",
  title: "Execute SQL Statement",
  description:
    "Run a SQL statement via the Snowflake SQL API v2. Snowflake executes synchronously for up " +
    "to ~45 seconds; a statement still running past that (or submitted with Run Asynchronously) " +
    'comes back with status "running" and a statementHandle — poll it with Get Statement.',
  // Arbitrary SQL may be DML; a caller must judge idempotency for their own statement.
  idempotent: false,
  params: [
    {
      key: "statement",
      label: "SQL statement",
      type: "code",
      ui: "code:sql",
      required: true,
      config: { multiline: true },
    },
    {
      key: "warehouse",
      label: "Warehouse",
      type: "string",
      row: "context",
      hint: "Falls back to the user's default warehouse if omitted.",
    },
    { key: "database", label: "Database", type: "string", row: "context" },
    { key: "schema", label: "Schema", type: "string", row: "context" },
    { key: "role", label: "Role", type: "string", row: "context" },
    {
      key: "timeout",
      label: "Execution timeout (seconds)",
      type: "number",
      advanced: true,
      hint: "0 = Snowflake's own maximum (604800s / 7 days).",
      validation: { min: 0, integer: true },
    },
    {
      key: "runAsync",
      label: "Run asynchronously",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "Return the statementHandle immediately instead of waiting up to ~45s for completion. " +
        "Poll the result with Get Statement.",
    },
    {
      key: "bindings",
      label: "Bind variables",
      type: "json",
      advanced: true,
      hint: 'Positional binds for `?` placeholders: { "1": { "type": "FIXED", "value": "42" } }.',
    },
  ],
  output: [
    { key: "statementHandle", type: "string", label: "Statement handle" },
    { key: "status", type: "string", label: "Status (complete | running)" },
    { key: "message", type: "string", label: "Message" },
    { key: "code", type: "string", label: "Snowflake code" },
    { key: "sqlState", type: "string", label: "SQL state" },
    { key: "resultSetMetaData", type: "object", label: "Result set metadata" },
    { key: "data", type: "array", label: "Raw result rows (column-position arrays)" },
    { key: "rows", type: "array", label: "Result rows as { column: value } records" },
  ],

  async execute(input, ctx) {
    const bindings =
      input.bindings === undefined || input.bindings === null || input.bindings === ""
        ? undefined
        : (typeof input.bindings === "string"
          ? JSON.parse(input.bindings)
          : input.bindings) as Record<
            string,
            { type: string; value: unknown }
          >;

    const result = await new SnowflakeClient(ctx).submitStatement(
      compact({
        statement: input.statement,
        warehouse: input.warehouse,
        database: input.database,
        schema: input.schema,
        role: input.role,
        timeout: input.timeout,
        bindings,
      }) as SubmitStatementBody,
      { runAsync: input.runAsync },
    );

    return {
      statementHandle: result.body.statementHandle,
      status: result.status,
      message: result.body.message,
      code: result.body.code,
      sqlState: result.body.sqlState,
      resultSetMetaData: result.body.resultSetMetaData,
      data: result.body.data,
      rows: result.rows,
    };
  },
};

export default statementExecute;
