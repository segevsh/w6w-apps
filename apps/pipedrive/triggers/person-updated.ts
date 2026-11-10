import { changedTrigger } from "../lib/triggers.ts";

/** A Pipedrive `change.person` webhook (registered through the API). */
export default changedTrigger({
  key: "person-updated",
  title: "Person Updated",
  description:
    "Fires when a person changes. The run gets the person as it is now and the previous values of the fields that changed.",
  action: "change",
  object: "person",
  sample: {
    action: "change",
    entity: "person",
    entityId: "7",
    timestamp: "2026-11-10T09:30:00.000Z",
    eventId: "9f1c2d3e-0000-4000-8000-000000000001",
    mergedFromId: null,
    mergedToId: null,
    current: { id: "7", name: "Ada Lovelace", org_id: "5" },
    previous: { name: "Ada L." },
  },
});
