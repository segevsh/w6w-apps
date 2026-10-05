import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";
import { recordIdParam, requireObject, tableKeyParam } from "../lib/params.ts";

/**
 * `PUT /v2/data-tables/:tableKey/records/:recordId` with `{ data }`. Despite the verb the
 * update is partial — only the fields sent change — and `data` may not be empty.
 */
interface Input {
  tableKey: string;
  recordId: string;
  data: unknown;
}

const dataRecordUpdate: ActionDefinition<Input> = {
  key: "data-record-update",
  type: "perform",
  resource: "data-record",
  title: "Update Data Record",
  description: "Update fields on a Data Table record. Only the fields sent change.",
  idempotent: true,
  params: [
    tableKeyParam,
    recordIdParam,
    { key: "data", label: "Data", type: "json", required: true, hint: "Fields to change." },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "tableKey", type: "string", label: "Table key" },
    { key: "data", type: "object", label: "Record data after the update" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const data = requireObject(input.data, "data");
    if (Object.keys(data).length === 0) throw new Error("data cannot be empty");
    return await new MemberstackClient(ctx).json(
      `/v2/data-tables/${encodeURIComponent(input.tableKey)}/records/${
        encodeURIComponent(input.recordId)
      }`,
      { method: "PUT", body: { data } },
    );
  },
};

export default dataRecordUpdate;
