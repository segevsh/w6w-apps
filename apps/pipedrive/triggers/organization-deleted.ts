import { changedTrigger } from "../lib/triggers.ts";

/** A Pipedrive `delete.organization` webhook (registered through the API). */
export default changedTrigger({
  key: "organization-deleted",
  title: "Organization Deleted",
  description:
    "Fires when an organization is deleted. The run gets the organization as it was (in `previous`).",
  action: "delete",
  object: "organization",
  sample: {
    action: "delete",
    entity: "organization",
    entityId: "5",
    timestamp: "2026-11-10T09:30:00.000Z",
    eventId: "9f1c2d3e-0000-4000-8000-000000000001",
    mergedFromId: null,
    mergedToId: null,
    current: null,
    previous: { id: "5", name: "Acme Ltd" },
  },
});
