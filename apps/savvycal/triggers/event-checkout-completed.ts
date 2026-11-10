import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "event-checkout-completed",
  title: "Event Checkout Completed",
  type: "event.checkout.completed",
  description:
    "Fires when someone books a paid event and pays successfully. The run gets the event.",
});
