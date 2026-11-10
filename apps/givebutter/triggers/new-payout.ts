import type { TriggerDefinition } from "@w6w/types";
import payoutList from "../actions/payout-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * Payouts are a small bounded set (one per campaign settlement) and GET /payouts has no sort or since filter.
 * Every check reads all pages through `payout-list` and diffs the ids (`pollSnapshot`, added
 * only). https://docs.givebutter.com/api-reference/payouts/list-all-payouts (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-payout",
  title: "New Payout",
  description: "The run gets each payout newly created for your Givebutter account.",
  output: [
    { key: "id", type: "number", label: "Payout ID" },
    { key: "campaign_id", type: "number", label: "Campaign ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 5001,
    campaign_id: 1201,
    status: "pending",
    amount: 1000,
    created_at: "2026-11-09T10:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({ state, items: await readAllPages(payoutList, {}, ctx) });
  },
};

export default trigger;
