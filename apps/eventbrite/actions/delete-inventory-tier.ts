import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  inventoryTierId: string;
}

const action: ActionDefinition<Input> = {
  key: "delete-inventory-tier",
  type: "perform",
  resource: "inventory_tier",
  title: "Delete Inventory Tier",
  description:
    "Mark an Inventory Tier as deleted on Eventbrite. Fails if attendees or seat assignments reference it.",
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
  output: [
    {
      "key": "deleted",
      "type": "boolean",
      "label": "Whether the tier was deleted",
    },
  ],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/inventory_tiers/${
        encodeURIComponent(input.inventoryTierId)
      }/`,
      { method: "DELETE" },
    );
  },
};

export default action;
