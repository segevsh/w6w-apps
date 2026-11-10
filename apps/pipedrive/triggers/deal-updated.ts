import { changedTrigger } from "../lib/triggers.ts";

/** A Pipedrive `change.deal` webhook (registered through the API). */
export default changedTrigger({
  key: "deal-updated",
  title: "Deal Updated",
  description:
    "Fires when a deal changes (stage, value, owner, status and so on). The run gets the deal as it is now and the previous values of the fields that changed.",
  action: "change",
  object: "deal",
  sample: {
    action: "change",
    entity: "deal",
    entityId: "42",
    timestamp: "2026-11-10T09:30:00.000Z",
    eventId: "9f1c2d3e-0000-4000-8000-000000000001",
    mergedFromId: null,
    mergedToId: null,
    current: { id: "42", title: "Renewal", value: 1500, currency: "USD", status: "open" },
    previous: { value: 1200 },
  },
});
