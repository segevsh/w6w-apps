import type { ActionDefinition } from "@w6w/types";
import { CodaClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  rowId: string;
  useColumnNames?: boolean;
  valueFormat?: "simple" | "simpleWithArrays" | "rich";
}

interface Row {
  id: string;
  type: string;
  href: string;
  name: string;
  index?: number;
  values: Record<string, unknown>;
}

/** GET /docs/{docId}/tables/{tableIdOrName}/rows/{rowIdOrName} */
const getRow: ActionDefinition<Input, Row> = {
  key: "get-row",
  type: "read",
  resource: "row",
  title: "Get Row",
  description:
    "Retrieve a single row. If multiple rows share the identifying column value, an arbitrary one is returned.",
  params: [
    { key: "docId", label: "Doc ID", type: "string", required: true },
    {
      key: "tableId",
      label: "Table ID or name",
      type: "string",
      required: true,
      hint: "Table ID (preferred) or name.",
    },
    {
      key: "rowId",
      label: "Row ID or name",
      type: "string",
      required: true,
      hint: "Row ID (preferred) or name; URI-encode names.",
    },
    {
      key: "useColumnNames",
      label: "Use column names",
      type: "boolean",
      default: true,
      hint: "Key `values` by column name instead of column ID. Fragile if columns get renamed.",
    },
    {
      key: "valueFormat",
      label: "Value format",
      type: "select",
      options: [
        { value: "simple", label: "Simple" },
        { value: "simpleWithArrays", label: "Simple with arrays" },
        { value: "rich", label: "Rich" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Row ID" },
    { key: "values", type: "object", label: "Cell values" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<Row>(`/docs/${input.docId}/tables/${input.tableId}/rows/${input.rowId}`, {
      query: {
        useColumnNames: input.useColumnNames ?? true,
        valueFormat: input.valueFormat,
      },
    });
  },
};

export default getRow;
