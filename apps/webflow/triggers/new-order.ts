import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "new-order",
  title: "New Ecommerce Order",
  description:
    "Fires when a customer places an order on a Webflow Ecommerce site. The run gets the order, its status and the customer details.",
  triggerType: "ecomm_new_order",
});
