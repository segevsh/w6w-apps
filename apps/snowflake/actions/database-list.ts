import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  SnowflakeClient,
  sqlStringLiteral,
  type SubmitStatementBody,
} from "../lib/client.ts";

interface Input {
  role?: string;
  like?: string;
}

interface Output {
  rows: Array<Record<string, unknown>>;
  statementHandle?: string;
  status: string;
}

/**
 * `SHOW DATABASES` — Snowflake's own metadata command, run through the same
 * SQL API every other action uses. `SHOW` commands are metadata-only and (per
 * `docs.snowflake.com/en/sql-reference/sql/show-warehouses`, which documents
 * this explicitly for the warehouses case) do not require an active
 * warehouse, unlike a data query — which is why this convenience action
 * collects no `warehouse` param.
 */
const databaseList: ActionDefinition<Input, Output> = {
  key: "database-list",
  type: "read",
  resource: "database",
  title: "List Databases",
  description: "Runs `SHOW DATABASES` and returns the rows as records.",
  params: [
    {
      key: "like",
      label: "Name filter (LIKE pattern)",
      type: "string",
      hint: 'SQL LIKE pattern, e.g. "ANALYTICS_%". Omit to list everything visible to the role.',
    },
    { key: "role", label: "Role", type: "string", advanced: true },
  ],
  output: [
    { key: "rows", type: "array", label: "Databases" },
    { key: "statementHandle", type: "string", label: "Statement handle (if still running)" },
    { key: "status", type: "string", label: "Status (complete | running)" },
  ],

  async execute(input, ctx) {
    const statement = input.like
      ? `SHOW DATABASES LIKE ${sqlStringLiteral(input.like)}`
      : "SHOW DATABASES";
    const result = await new SnowflakeClient(ctx).submitStatement(
      compact({ statement, role: input.role }) as SubmitStatementBody,
    );
    return {
      rows: result.rows,
      statementHandle: result.body.statementHandle,
      status: result.status,
    };
  },
};

export default databaseList;
