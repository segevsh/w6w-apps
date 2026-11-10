import { webhookTrigger, type WebhookTriggerSpec } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec: WebhookTriggerSpec = {
  key: "transfer-active-cases",
  title: "Transfer Active Cases",
  description:
    "Fires when a transfer's list of active issues changes (for example a deposit that does not match the invoice). The run gets the event: the transfer id and its current active cases.",
  eventType: "transfers#active-cases",
  // Wise 4.0.0 payload: data.resource = { type: "transfer", id, profile_id, account_id }.
  profilePath: ["resource", "profile_id"],
  sampleData: {
    resource: { type: "transfer", id: 111, profile_id: 222, account_id: 333 },
    active_cases: ["deposit_amount_less_invoice"],
  },
};

const trigger = webhookTrigger(spec);

export default trigger;
