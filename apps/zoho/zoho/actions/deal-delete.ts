import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmDelete } from "../lib/crm.ts";
import { recordId, writeOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
}

const dealDelete: ActionDefinition<Input, ZohoRecordResult> = {
  key: "deal-delete",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description: "Delete a Deal record. Zoho moves it to Recycle Bin, recoverable for 30 days.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return crmDelete(ctx, "Deals", input);
  },
};

export default dealDelete;
