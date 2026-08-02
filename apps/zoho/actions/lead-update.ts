import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmUpdate } from "../lib/crm.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
  fields: unknown;
}

const leadUpdate: ActionDefinition<Input, ZohoRecordResult> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update a Lead's fields.",
  // A PUT writes absolute values for the fields given, so replaying converges.
  idempotent: true,
  params: [
    recordId,
    { ...dataFields, hint: 'Only the fields to change, e.g. { "Lead_Status": "Contacted" }.' },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return crmUpdate(ctx, "Leads", input);
  },
};

export default leadUpdate;
