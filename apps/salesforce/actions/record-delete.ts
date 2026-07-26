import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient, sobjectName } from "../lib/client.ts";
import { recordId, sobject } from "../lib/params.ts";

/**
 * Deleted records go to the org's Recycle Bin and are recoverable for 15 days
 * (subject to the org's retention settings).
 */
const recordDelete: ActionDefinition<{ sobject: string; recordId: string }> = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  description: "Delete a record. It goes to the Recycle Bin, recoverable for about 15 days.",
  idempotent: true,
  params: [sobject, recordId],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new SalesforceClient(ctx).request(
      `/sobjects/${sobjectName(input.sobject)}/${encodeURIComponent(input.recordId)}`,
      { method: "DELETE" },
    );
  },
};

export default recordDelete;
