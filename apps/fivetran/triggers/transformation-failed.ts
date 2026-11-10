import { webhookTrigger } from "../lib/triggers.ts";

/** Transformation Failed: Fivetran event `transformation_failed`. */
const trigger = webhookTrigger({
  key: "transformation-failed",
  title: "Transformation Failed",
  description:
    "Fires when a Fivetran transformation run fails. The run gets the event, its time and the vendor's details in data, plus the destination (group) when Fivetran sends it.",
  eventName: "transformation_failed",
  sample: {
    event: "transformation_failed",
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
