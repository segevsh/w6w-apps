import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "order-changed",
  title: "Ecommerce Order Changed",
  description:
    "Fires when an order on a Webflow Ecommerce site changes (fulfilled, refunded, disputed, comment added). The run gets the order, its new status and the customer details.",
  triggerType: "ecomm_order_changed",
});
