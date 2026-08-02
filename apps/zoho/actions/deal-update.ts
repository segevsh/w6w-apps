import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmUpdate } from "../lib/crm.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
  fields: unknown;
}

const dealUpdate: ActionDefinition<Input, ZohoRecordResult> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description: "Update a Deal's fields.",
  idempotent: true,
  params: [
    recordId,
    { ...dataFields, hint: 'Only the fields to change, e.g. { "Stage": "Closed Won" }.' },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return crmUpdate(ctx, "Deals", input);
  },
};

export default dealUpdate;
