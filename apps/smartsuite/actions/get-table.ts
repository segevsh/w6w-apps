import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  tableId: string;
}

/**
 * `GET /applications/{tableId}/` — a Table's full structure: its fields
 * (slugs, labels, types, options) and views.
 *
 * This is the action a workflow should call before writing records, since
 * record bodies are keyed by each table's own field slugs — see
 * `create-record`.
 */
const getTable: ActionDefinition<Input> = {
  key: "get-table",
  type: "read",
  resource: "table",
  title: "Get Table",
  description:
    "Retrieve a SmartSuite Table's structure, including its fields (GET /applications/{tableId}/).",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "The `id` of a Table, as returned by List Tables.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Table ID" },
    { key: "name", type: "string", label: "Table name" },
    { key: "structure", type: "object", label: "Fields and views" },
  ],

  execute(input, ctx) {
    return new SmartSuiteClient(ctx).request(
      `applications/${encodeSegment(input.tableId)}/`,
    );
  },
};

export default getTable;
