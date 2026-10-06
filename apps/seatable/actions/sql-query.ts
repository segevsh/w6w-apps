import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asArray } from "../lib/params.ts";

interface Input {
  sql: string;
  parameters?: unknown;
  convertKeys?: boolean;
  serverOnly?: boolean;
}

const sqlQuery: ActionDefinition<Input> = {
  key: "sql-query",
  type: "perform",
  resource: "row",
  title: "Run SQL Query",
  description:
    "Run a SQL statement against the base. SELECT returns up to 10,000 rows (100 unless the " +
    "statement has a LIMIT); UPDATE and DELETE change rows and are not retry-safe in general. " +
    "INSERT only works on bases with the big-data backend. Bind values with `?` placeholders " +
    "and the Parameters list rather than building them into the statement.",
  idempotent: false,
  params: [
    {
      key: "sql",
      label: "SQL",
      type: "code",
      required: true,
      hint: "e.g. SELECT * FROM Contacts WHERE Age >= ? ORDER BY Name LIMIT 100. No JOIN keyword " +
        "(use `FROM T1, T2 WHERE …`), no subqueries, no UNION.",
    },
    {
      key: "parameters",
      label: "Parameters",
      type: "json",
      hint: 'A JSON array that replaces the `?` placeholders in order, e.g. ["Alice", 30].',
    },
    {
      key: "convertKeys",
      label: "Return column names",
      type: "boolean",
      default: true,
      hint: "On: results are keyed by column name. Off: by internal column key (e.g. 0000).",
    },
    {
      key: "serverOnly",
      label: "Normal backend only",
      type: "boolean",
      hint: "Skip rows in the big-data backend.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "results", type: "array", label: "Result rows" },
    { key: "metadata", type: "array", label: "Column metadata" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      sql: input.sql,
      convert_keys: input.convertKeys ?? true,
    };
    if (input.parameters !== undefined && input.parameters !== "") {
      body.parameters = asArray(input.parameters, "Parameters");
    }
    if (input.serverOnly !== undefined) body.server_only = input.serverOnly;
    return new SeaTableClient(ctx).request("/sql/", { method: "POST", body });
  },
};

export default sqlQuery;
