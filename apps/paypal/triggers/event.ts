import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "event",
  title: "PayPal Event",
  description: "Fires on the PayPal event types you list. The run gets the event and its resource.",
});

export default trigger;
