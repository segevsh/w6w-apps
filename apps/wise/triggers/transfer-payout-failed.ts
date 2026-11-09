import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "transfer-payout-failed",
  title: "Transfer Payout Failed",
  description:
    "Fires when the payout of a transfer fails. The run gets the event: the transfer id and the failure reason code and description.",
  eventType: "transfers#payout-failure",
  sampleData: {
    resource: { type: "transfer", id: 111, profile_id: 222, account_id: 333 },
    failure_reason_code: "invalid_account_details",
    failure_description: "The recipient account details are invalid",
    occurred_at: "2026-11-09T10:12:50Z",
  },
});

export default trigger;
