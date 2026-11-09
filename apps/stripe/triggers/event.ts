import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "event",
  title: "Stripe Event",
  description:
    "Fires on the Stripe event types you list. The run gets the event and its object (data.object).",
});

export default trigger;
