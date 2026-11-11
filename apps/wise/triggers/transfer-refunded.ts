import { webhookTrigger, type WebhookTriggerSpec } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec: WebhookTriggerSpec = {
  key: "transfer-refunded",
  title: "Transfer Refunded",
  description:
    "Fires when a transfer is refunded. The run gets the event: the transfer id, the refund amount and currency and when it happened.",
  eventType: "transfers#refund",
  // Wise payload: data.resource = { type: "transfer", id, profile_id, account_id, refund_amount, refund_currency }.
  profilePath: ["resource", "profile_id"],
  sampleData: {
    resource: {
      type: "transfer",
      id: 111,
      profile_id: 222,
      account_id: 333,
      refund_amount: 5000,
      refund_currency: "EUR",
    },
    occurred_at: "2026-11-09T10:12:50Z",
  },
};

const trigger = webhookTrigger(spec);

export default trigger;
