import { snapshotTrigger } from "../lib/polls.ts";
import listInventoryTiers from "../actions/list-inventory-tiers.ts";
import { INVENTORY_TIER_LIST_ITEM_OUTPUT, T5_SAMPLE } from "../lib/outputs.ts";

/**
 * Eventbrite sends no webhook for inventory tiers, and an event has a few, so the whole list
 * (`GET /events/{id}/inventory_tiers/`, read by `list-inventory-tiers`) is compared check to check.
 * The endpoint takes no continuation token; a response that says it has more is refused.
 * https://www.eventbrite.com/platform/api (verified 2026-11-10).
 */
const newInventoryTier = snapshotTrigger({
  key: "new-inventory-tier",
  title: "New Inventory Tier",
  description:
    "Checks an event's inventory tiers on a schedule. The run gets each tier added since the previous check: its number, seat map number and holds.",
  action: listInventoryTiers,
  list: "inventory_tiers",
  paged: false,
  params: [{
    key: "eventId",
    label: "Event ID",
    type: "string",
    required: true,
    hint: "The event to watch.",
  }],
  input: (p) => ({ eventId: String(p.eventId ?? "").trim() }),
  output: INVENTORY_TIER_LIST_ITEM_OUTPUT,
  sample: T5_SAMPLE.tierList.inventory_tiers[0],
});

export default newInventoryTier;
