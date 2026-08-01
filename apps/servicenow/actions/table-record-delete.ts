import type { ActionDefinition } from "@w6w/types";
import { ServiceNowClient, tablePath } from "../lib/client.ts";

interface Input {
  table: string;
  sysId: string;
}

const tableRecordDelete: ActionDefinition<Input> = {
  key: "table-record-delete",
  type: "perform",
  resource: "table-record",
  title: "Delete Table Record",
  description: "Delete a record from an arbitrary table by sys_id.",
  idempotent: true,
  params: [
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      placeholder: "problem",
      hint: "The table's technical name.",
    },
    { key: "sysId", label: "Sys ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    // The Table API returns 204 with no body on a successful DELETE.
    await new ServiceNowClient(ctx).request(tablePath(input.table, input.sysId), {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default tableRecordDelete;
