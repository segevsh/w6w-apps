import { webhookTrigger, type WebhookTriggerSpec } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec: WebhookTriggerSpec = {
  key: "balance-credited",
  title: "Balance Credited",
  description:
    "Fires when money arrives in a balance. The run gets the event: the balance, currency, amount credited and the resulting balance.",
  // Wise has one balance event, `balances#update`; its `transaction_type` says credit or debit.
  eventType: "balances#update",
  profilePath: ["resource", "profile_id"],
  accept: (data) => data.transaction_type === "credit",
  sampleData: {
    resource: { id: 555, profile_id: 222, type: "balance-account" },
    transaction_type: "credit",
    amount: 70,
    balance_id: 111,
    channel_name: "TRANSFER",
    currency: "GBP",
    post_transaction_balance_amount: 88.93,
    occurred_at: "2026-11-09T10:12:50Z",
  },
};

const trigger = webhookTrigger(spec);

export default trigger;
