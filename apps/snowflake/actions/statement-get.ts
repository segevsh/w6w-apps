import type { ActionDefinition } from "@w6w/types";
import { SnowflakeClient } from "../lib/client.ts";

interface Input {
  statementHandle: string;
  partition?: number;
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

const statementGet: ActionDefinition<Input, Output> = {
  key: "statement-get",
  type: "read",
  resource: "statement",
  title: "Get Statement Status / Results",
  description:
    "Poll a statement submitted with Execute SQL Statement (or a Run Asynchronously one) by its " +
    'handle. Still "running" until Snowflake finishes; large result sets are split into ' +
    "partitions Snowflake tells you about in resultSetMetaData.partitionInfo.",
  params: [
    { key: "statementHandle", label: "Statement handle", type: "string", required: true },
    {
      key: "partition",
      label: "Partition",
      type: "number",
      advanced: true,
      hint:
        "0-based index into resultSetMetaData.partitionInfo, for result sets split across pages.",
      validation: { min: 0, integer: true },
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
    const result = await new SnowflakeClient(ctx).getStatement(input.statementHandle, {
      partition: input.partition,
    });
    return {
      statementHandle: result.body.statementHandle ?? input.statementHandle,
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

export default statementGet;
