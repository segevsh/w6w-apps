import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "event",
  title: "Shopify Event",
  description:
    "Fires on the Shopify webhook topics you list. The run gets the topic, the delivery ids and the resource.",
});

export default trigger;
