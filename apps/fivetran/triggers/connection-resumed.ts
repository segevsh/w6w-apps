import { webhookTrigger } from "../lib/triggers.ts";

/** Connection Resumed: Fivetran event `resume_connector`. */
const trigger = webhookTrigger({
  key: "connection-resumed",
  title: "Connection Resumed",
  description:
    "Fires when a paused connection is resumed. The run gets the connection, its type and destination, and the vendor's details in data.",
  eventName: "resume_connector",
  sample: {
    event: "resume_connector",
    created: "2026-11-10T09:30:00.386Z",
    connectorType: "postgres",
    connectorId: "mystified_presiding",
    connectorName: "mystified_presiding",
    syncId: null,
    destinationGroupId: "deck_enjoy",
    data: {},
  },
});

export default trigger;
