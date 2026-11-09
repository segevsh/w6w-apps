import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "transfer-state-changed",
  title: "Transfer State Changed",
  description:
    "Fires when a transfer moves to a new status. The run gets the event: the transfer id, its current and previous state and when it happened.",
  eventType: "transfers#state-change",
  sampleData: {
    resource: { type: "transfer", id: 111, profile_id: 222, account_id: 333 },
    current_state: "outgoing_payment_sent",
    previous_state: "processing",
    occurred_at: "2026-11-09T10:12:50Z",
  },
});

export default trigger;
