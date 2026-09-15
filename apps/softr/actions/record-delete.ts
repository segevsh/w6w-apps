import type { ActionDefinition } from "@w6w/types";
import { encodeId, TablesClient } from "../lib/client.ts";
import { databaseIdParam, recordIdParam, tableIdParam } from "../lib/params.ts";

interface Input {
  databaseId: string;
  tableId: string;
  recordId: string;
}

const recordDelete: ActionDefinition<Input> = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  description: "Delete a record by its ID. Softr answers 204 with no body.",
  idempotent: true,
  params: [databaseIdParam, tableIdParam, recordIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new TablesClient(ctx).remove(
      `/databases/${encodeId(input.databaseId)}/tables/${encodeId(input.tableId)}/records/${
        encodeId(input.recordId)
      }`,
    );
    return { deleted: true };
  },
};

export default recordDelete;
