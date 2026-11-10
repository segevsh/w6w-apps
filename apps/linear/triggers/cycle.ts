import { webhookTrigger } from "../lib/triggers.ts";

/** A cycle created, updated or removed. */
const cycle = webhookTrigger({
  key: "cycle",
  title: "Cycle Event",
  description:
    "Fires when a cycle (sprint) is created, updated or removed. The run gets the action, the cycle and, on an update, the values that changed.",
  resourceType: "Cycle",
  output: [
    { key: "data.number", type: "number", label: "Cycle number" },
    { key: "data.name", type: "string", label: "Name" },
    { key: "data.startsAt", type: "string", label: "Starts at" },
    { key: "data.endsAt", type: "string", label: "Ends at" },
  ],
  sampleData: {
    id: "c0ffee00-1234-4abc-9def-0123456789ab",
    number: 7,
    name: "Cycle 7",
    startsAt: "2026-11-09T00:00:00.000Z",
    endsAt: "2026-11-23T00:00:00.000Z",
  },
});

export default cycle;
