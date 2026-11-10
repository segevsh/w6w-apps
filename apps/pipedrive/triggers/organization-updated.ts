import { changedTrigger } from "../lib/triggers.ts";

/** A Pipedrive `change.organization` webhook (registered through the API). */
export default changedTrigger({
  key: "organization-updated",
  title: "Organization Updated",
  description:
    "Fires when an organization changes. The run gets the organization as it is now and the previous values of the fields that changed.",
  action: "change",
  object: "organization",
  sample: {
    action: "change",
    entity: "organization",
    entityId: "5",
    timestamp: "2026-11-10T09:30:00.000Z",
    eventId: "9f1c2d3e-0000-4000-8000-000000000001",
    mergedFromId: null,
    mergedToId: null,
    current: { id: "5", name: "Acme Ltd" },
    previous: { name: "Acme" },
  },
});
