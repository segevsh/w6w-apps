import type { TriggerDefinition } from "@w6w/types";
import { checkTransfers, type NewTransferParams } from "../lib/triggers.ts";

/**
 * `transfer-list`: `GET /transfers` takes `createdDateStart` / `createdDateEnd`, `limit` and `offset`
 * and documents no sort order (https://docs.wise.com/api-reference/transfer, bundle 2026Q4, verified
 * 2026-11-10), so this is the since-filter shape: each check lists the window since the last one,
 * resumes a window of more than three pages on the next check, and never emits a transfer created
 * before the trigger was first checked.
 */
const trigger: TriggerDefinition<NewTransferParams> = {
  key: "new-transfer",
  title: "New Transfer",
  description:
    "The run gets each transfer newly created on the chosen Wise profile (transfers that already existed when the trigger was set up are not emitted).",
  params: [
    {
      key: "profileId",
      label: "Profile ID",
      type: "number",
      hint: "Personal or business profile; defaults to the personal profile.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Transfer ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created", type: "string", label: "Created" },
    { key: "sourceCurrency", type: "string", label: "Source Currency" },
    { key: "sourceValue", type: "number", label: "Source Amount" },
    { key: "targetCurrency", type: "string", label: "Target Currency" },
    { key: "targetValue", type: "number", label: "Target Amount" },
    { key: "targetAccount", type: "number", label: "Recipient Account ID" },
  ],
  sample: {
    id: 16521632,
    user: 4342275,
    targetAccount: 8692237,
    status: "incoming_payment_waiting",
    rate: 0.89,
    created: "2026-11-09 10:47:49",
    sourceCurrency: "EUR",
    sourceValue: 100,
    targetCurrency: "GBP",
    targetValue: 89,
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    return await checkTransfers(params, state, ctx);
  },
};

export default trigger;
