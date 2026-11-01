import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { INVENTORY_TIER_OUTPUT, INVENTORY_TIER_SAMPLE } from "../lib/outputs.ts";

interface Input {
  eventId: string;
  inventoryTierId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-inventory-tier",
  type: "read",
  resource: "inventory_tier",
  title: "Get Inventory Tier",
  description: "Retrieve an Inventory Tier by ID for an Event.",
  params: [
    {
      "key": "eventId",
      "label": "Event ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "inventoryTierId",
      "label": "Inventory Tier ID",
      "type": "string",
      "required": true,
    },
  ],
  output: INVENTORY_TIER_OUTPUT,
  sample: INVENTORY_TIER_SAMPLE,
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/inventory_tiers/${
        encodeURIComponent(input.inventoryTierId)
      }/`,
    );
  },
};

export default action;
