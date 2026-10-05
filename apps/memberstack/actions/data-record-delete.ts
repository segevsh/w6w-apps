import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";
import { recordIdParam, tableKeyParam } from "../lib/params.ts";

/** `DELETE /v2/data-tables/:tableKey/records/:recordId` — permanent; returns the deleted record. */
interface Input {
  tableKey: string;
  recordId: string;
}

const dataRecordDelete: ActionDefinition<Input> = {
  key: "data-record-delete",
  type: "perform",
  resource: "data-record",
  title: "Delete Data Record",
  description: "Permanently delete a Data Table record. Cannot be undone.",
  idempotent: true,
  params: [tableKeyParam, recordIdParam],
  output: [
    { key: "id", type: "string", label: "Deleted record ID" },
    { key: "tableKey", type: "string", label: "Table key" },
    { key: "data", type: "object", label: "The deleted record's data" },
  ],

  execute(input, ctx) {
    return new MemberstackClient(ctx).json(
      `/v2/data-tables/${encodeURIComponent(input.tableKey)}/records/${
        encodeURIComponent(input.recordId)
      }`,
      { method: "DELETE" },
    );
  },
};

export default dataRecordDelete;
