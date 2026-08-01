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

/** `SHOW WAREHOUSES` — see the comment on `database-list.ts` for why this needs no `warehouse` param. */
const warehouseList: ActionDefinition<Input, Output> = {
  key: "warehouse-list",
  type: "read",
  resource: "warehouse",
  title: "List Warehouses",
  description: "Runs `SHOW WAREHOUSES` and returns the rows as records.",
  params: [
    {
      key: "like",
      label: "Name filter (LIKE pattern)",
      type: "string",
      hint: 'SQL LIKE pattern, e.g. "ETL_%". Omit to list everything visible to the role.',
    },
    { key: "role", label: "Role", type: "string", advanced: true },
  ],
  output: [
    { key: "rows", type: "array", label: "Warehouses" },
    { key: "statementHandle", type: "string", label: "Statement handle (if still running)" },
    { key: "status", type: "string", label: "Status (complete | running)" },
  ],

  async execute(input, ctx) {
    const statement = input.like
      ? `SHOW WAREHOUSES LIKE ${sqlStringLiteral(input.like)}`
      : "SHOW WAREHOUSES";
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

export default warehouseList;
