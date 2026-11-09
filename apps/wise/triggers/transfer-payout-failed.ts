import { webhookTrigger, type WebhookTriggerSpec } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec: WebhookTriggerSpec = {
  key: "transfer-payout-failed",
  title: "Transfer Payout Failed",
  description:
    "Fires when the payout of a transfer fails. The run gets the event: the transfer id and the failure reason code and description.",
  eventType: "transfers#payout-failure",
  // Wise 5.0.0 payload (the documented one): data = { transfer_id, profile_id, failure_* }.
  profilePath: ["profile_id"],
  schemaVersion: "5.0.0",
  sampleData: {
    transfer_id: 111,
    profile_id: 222,
    failure_reason_code: "invalid_account_details",
    failure_description: "The recipient account details are invalid",
    occurred_at: "2026-11-09T10:12:50Z",
  },
};

const trigger = webhookTrigger(spec);

export default trigger;
