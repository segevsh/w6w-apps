import { changedTrigger } from "../lib/triggers.ts";

/** A Pipedrive `delete.person` webhook (registered through the API). */
export default changedTrigger({
  key: "person-deleted",
  title: "Person Deleted",
  description: "Fires when a person is deleted. The run gets the person as it was (in `previous`).",
  action: "delete",
  object: "person",
  sample: {
    action: "delete",
    entity: "person",
    entityId: "7",
    timestamp: "2026-11-10T09:30:00.000Z",
    eventId: "9f1c2d3e-0000-4000-8000-000000000001",
    mergedFromId: null,
    mergedToId: null,
    current: null,
    previous: { id: "7", name: "Ada Lovelace", org_id: "5" },
  },
});
