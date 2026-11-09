import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "balance-updated",
  title: "Balance Updated",
  description:
    "Fires when a balance is credited or debited. The run gets the event: the balance, currency, amount and the resulting balance.",
  eventType: "balances#update",
  sampleData: {
    resource: { id: 555, profile_id: 222, type: "balance-account" },
    transaction_type: "credit",
    amount: 10.5,
    currency: "EUR",
    post_transaction_balance_amount: 110.5,
    occurred_at: "2026-11-09T10:12:50Z",
  },
});

export default trigger;
