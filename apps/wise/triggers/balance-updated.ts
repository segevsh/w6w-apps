import { webhookTrigger, type WebhookTriggerSpec } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec: WebhookTriggerSpec = {
  key: "balance-updated",
  title: "Balance Updated",
  description:
    "Fires when a balance is credited or debited. The run gets the event: the balance, currency, amount and the resulting balance.",
  eventType: "balances#update",
  // Wise 4.0.0 payload: data.resource = { type: "balance-account", id, profile_id }.
  profilePath: ["resource", "profile_id"],
  sampleData: {
    resource: { id: 555, profile_id: 222, type: "balance-account" },
    transaction_type: "credit",
    amount: 10.5,
    currency: "EUR",
    post_transaction_balance_amount: 110.5,
    occurred_at: "2026-11-09T10:12:50Z",
  },
};

const trigger = webhookTrigger(spec);

export default trigger;
