import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "inventory-level-updated",
  title: "Inventory Level Updated",
  description:
    "Fires when the stock of an item changes at a location. The run gets the inventory item, the location and the available quantity.",
  topics: ["inventory_levels/update"],
  sampleResource: {
    inventory_item_id: 271878346596884000,
    location_id: 24826418,
    available: 6,
    updated_at: "2026-11-10T09:30:00-05:00",
  },
});

export default trigger;
