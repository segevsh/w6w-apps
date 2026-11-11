import { webhookTrigger } from "../lib/triggers.ts";

/** Transformation Succeeded: Fivetran event `transformation_succeeded`. */
const trigger = webhookTrigger({
  key: "transformation-succeeded",
  title: "Transformation Succeeded",
  description:
    "Fires when a Fivetran transformation run succeeds. The run gets the event, its time and the vendor's details in data, plus the destination (group) when Fivetran sends it.",
  eventName: "transformation_succeeded",
  sample: {
    event: "transformation_succeeded",
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
