import { webhookTrigger } from "../lib/triggers.ts";

/** A Smart Campaign's "Call Webhook" step posts a lead's tokens to w6w. */
const leadWebhook = webhookTrigger({
  key: "lead-webhook",
  title: "Smart Campaign Webhook",
  description:
    "Fires when a Marketo Smart Campaign reaches a Call Webhook step that points at this trigger, for example when a lead fills in a form or changes a field. The run gets the payload your webhook template sends, with the leadId, email and campaign keys lifted out when present.",
});

export default leadWebhook;
