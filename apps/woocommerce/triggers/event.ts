import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "event",
  title: "WooCommerce Event",
  description:
    "Fires on the WooCommerce webhook topics you list. The run gets the topic, the delivery ids and the payload.",
});

export default trigger;
