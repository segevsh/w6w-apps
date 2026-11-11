import { anyEventTrigger } from "../lib/triggers.ts";

/** Pipedrive webhooks on the `<action>.<object>` events the user lists (empty = `*.*`). */
export default anyEventTrigger({
  key: "any-event",
  sample: {
    action: "change",
    entity: "product",
    entityId: "15",
    timestamp: "2026-11-10T09:30:00.000Z",
    eventId: "9f1c2d3e-0000-4000-8000-000000000001",
    mergedFromId: null,
    mergedToId: null,
    current: { id: "15", name: "Support plan", prices: [] },
    previous: { name: "Support" },
  },
});
