import { webhookTrigger } from "../lib/triggers.ts";

/** Transformation Started: Fivetran event `transformation_start`. */
const trigger = webhookTrigger({
  key: "transformation-started",
  title: "Transformation Started",
  description:
    "Fires when a Fivetran transformation run starts. The run gets the event, its time and the vendor's details in data, plus the destination (group) when Fivetran sends it.",
  eventName: "transformation_start",
  sample: {
    event: "transformation_start",
    created: "2026-11-10T09:30:00.386Z",
    connectorType: null,
    connectorId: null,
    connectorName: null,
    syncId: null,
    destinationGroupId: "deck_enjoy",
    data: {},
  },
});

export default trigger;
