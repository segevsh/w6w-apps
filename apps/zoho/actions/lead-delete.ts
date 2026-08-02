import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmDelete } from "../lib/crm.ts";
import { recordId, writeOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
}

const leadDelete: ActionDefinition<Input, ZohoRecordResult> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description: "Delete a Lead record. Zoho moves it to Recycle Bin, recoverable for 30 days.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return crmDelete(ctx, "Leads", input);
  },
};

export default leadDelete;
