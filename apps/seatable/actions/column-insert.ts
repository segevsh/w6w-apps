import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asObject, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  columnName: string;
  columnType: string;
  anchorColumn?: string;
  columnData?: unknown;
}

/** The `column_type` values of the Insert Column request schema. */
export const COLUMN_TYPES = [
  "text",
  "long-text",
  "number",
  "collaborator",
  "date",
  "duration",
  "single-select",
  "multiple-select",
  "image",
  "file",
  "email",
  "url",
  "checkbox",
  "geolocation",
  "rate",
  "formula",
  "link",
  "link-formula",
  "creator",
  "ctime",
  "last-modifier",
  "mtime",
  "auto-number",
  "button",
] as const;

const columnInsert: ActionDefinition<Input> = {
  key: "column-insert",
  type: "perform",
  resource: "column",
  title: "Insert Column",
  description:
    "Add one column to a table. The vendor documents adding a single column at the end of the " +
    "table. The response is the new column's definition including its `key`.",
  idempotent: false,
  params: [
    tableNameParam,
    { key: "columnName", label: "Column name", type: "string", required: true },
    {
      key: "columnType",
      label: "Column type",
      type: "select",
      required: true,
      options: COLUMN_TYPES.map((value) => ({ value, label: value })),
    },
    {
      key: "anchorColumn",
      label: "Insert after column",
      type: "string",
      hint: "Optional name or key of the column to place the new one after.",
    },
    {
      key: "columnData",
      label: "Column settings",
      type: "json",
      hint: "Optional `column_data` object for types that take settings (number, date, " +
        "single-select, link, formula, …). See SeaTable's Insert Column reference for each shape.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "Column key" },
    { key: "name", type: "string", label: "Column name" },
    { key: "type", type: "string", label: "Column type" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      table_name: input.tableName,
      column_name: input.columnName,
      column_type: input.columnType,
    };
    if (input.anchorColumn) body.anchor_column = input.anchorColumn;
    if (input.columnData !== undefined && input.columnData !== "") {
      body.column_data = asObject(input.columnData, "Column settings");
    }
    return new SeaTableClient(ctx).request("/columns/", { method: "POST", body });
  },
};

export default columnInsert;
