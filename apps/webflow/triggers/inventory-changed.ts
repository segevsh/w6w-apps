import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "inventory-changed",
  title: "Ecommerce Inventory Changed",
  description:
    "Fires when the stock of an Ecommerce item changes. The run gets the new quantity and inventory type.",
  triggerType: "ecomm_inventory_changed",
});
