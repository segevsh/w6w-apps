import type { TriggerDefinition } from "@w6w/types";
import affiliatePaymentsList from "../actions/affiliate-payments-list.ts";
import { affiliateIdParam } from "../lib/params.ts";
import { newRecords, readAll } from "../lib/triggers.ts";

/**
 * One affiliate's payments are a small bounded collection
 * (https://developers.tapfiliate.com/api-reference/affiliates/list-affiliates-payments, 2026-11-10):
 * every check reads `affiliate-payments-list` for the chosen affiliate and diffs the payment ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-affiliate-payment",
  title: "New Affiliate Payment",
  description: "The run gets each new payment made to the chosen affiliate.",
  params: [affiliateIdParam],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "affiliate", type: "object", label: "Affiliate" },
  ],
  sample: {
    id: "pa_eXampl3",
    created_at: "2026-11-09T12:00:00+00:00",
    affiliate: { id: "janejameson", firstname: "Jane", lastname: "Jameson" },
    amount: 50,
    currency: "USD",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const items = await readAll(affiliatePaymentsList, {
      affiliateId: (params as { affiliateId?: string }).affiliateId,
    }, ctx);
    return newRecords({ state, items, idOf: (p) => (p as { id?: unknown }).id });
  },
};

export default trigger;
