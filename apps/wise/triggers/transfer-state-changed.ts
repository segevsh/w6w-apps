import { webhookTrigger, type WebhookTriggerSpec } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec: WebhookTriggerSpec = {
  key: "transfer-state-changed",
  title: "Transfer State Changed",
  description:
    "Fires when a transfer moves to a new status. The run gets the event: the transfer id, its current and previous state and when it happened.",
  eventType: "transfers#state-change",
  // Wise 4.0.0 payload: data.resource = { type: "transfer", id, profile_id, account_id }.
  profilePath: ["resource", "profile_id"],
  sampleData: {
    resource: { type: "transfer", id: 111, profile_id: 222, account_id: 333 },
    current_state: "outgoing_payment_sent",
    previous_state: "processing",
    occurred_at: "2026-11-09T10:12:50Z",
  },
};

const trigger = webhookTrigger(spec);

export default trigger;
