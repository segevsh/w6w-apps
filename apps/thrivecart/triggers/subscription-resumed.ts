import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `subscription_resumed`. */
const subscriptionResumed = webhookTrigger({
  key: "subscription-resumed",
  title: "Subscription Resumed",
  description:
    "Fires when a ThriveCart subscription is resumed (event subscription_resumed). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "subscription_resumed",
});

export default subscriptionResumed;
