import { changedTrigger } from "../lib/triggers.ts";

/** A Pipedrive `delete.deal` webhook (registered through the API). */
export default changedTrigger({
  key: "deal-deleted",
  title: "Deal Deleted",
  description: "Fires when a deal is deleted. The run gets the deal as it was (in `previous`).",
  action: "delete",
  object: "deal",
  sample: {
    action: "delete",
    entity: "deal",
    entityId: "42",
    timestamp: "2026-11-10T09:30:00.000Z",
    eventId: "9f1c2d3e-0000-4000-8000-000000000001",
    mergedFromId: null,
    mergedToId: null,
    current: null,
    previous: { id: "42", title: "Renewal", value: 1200, currency: "USD", status: "open" },
  },
});
