import { webhookTrigger } from "../lib/triggers.ts";

/** ThriveCart event `subscription_paused`. */
const subscriptionPaused = webhookTrigger({
  key: "subscription-paused",
  title: "Subscription Paused",
  description:
    "Fires when a ThriveCart subscription is paused (event subscription_paused). Optional trigger fields narrow it to live or test mode or to chosen products. The run gets the event name, the delivery id, the event id and the full delivery as ThriveCart sent it.",
  event: "subscription_paused",
});

export default subscriptionPaused;
