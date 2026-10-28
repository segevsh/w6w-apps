import type { ActionDefinition } from "@w6w/types";
import type { ZohoRecordResult } from "../lib/client.ts";
import { crmCreate } from "../lib/crm.ts";
import { dataFields, writeOutput } from "../lib/params.ts";

interface Input {
  fields: unknown;
}

const dealCreate: ActionDefinition<Input, ZohoRecordResult> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description:
    'Create a Deal. `Deal_Name`, `Stage` and `Closing_Date` are Zoho\'s system-mandatory fields, e.g. { "Deal_Name": "Acme renewal", "Stage": "Qualification", "Closing_Date": "2026-09-01" }.',
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return crmCreate(ctx, "Deals", input);
  },
};

export default dealCreate;
