import type { ActionDefinition } from "@w6w/types";
import { NetSuiteClient, recordId, recordPath } from "../lib/client.ts";
import { recordIdParam, recordTypeParam } from "../lib/params.ts";

interface Input {
  recordType: string;
  id: string;
}

/** `DELETE /services/rest/record/v1/<type>/<id>` — "Deleting a Record Instance". 204, no body. */
const recordDelete: ActionDefinition<Input> = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  description: "Delete a record by internal id or external id. This cannot be undone.",
  // The record is gone after the first call; a retry reports it missing rather than deleting twice.
  idempotent: true,
  params: [recordTypeParam, recordIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new NetSuiteClient(ctx);
    await client.request(recordPath(input.recordType, recordId(input.id)), { method: "DELETE" });
    return { deleted: true };
  },
};

export default recordDelete;
