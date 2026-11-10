import { webhookTrigger } from "../lib/triggers.ts";

/** Connection Paused: Fivetran event `pause_connector`. */
const trigger = webhookTrigger({
  key: "connection-paused",
  title: "Connection Paused",
  description:
    "Fires when a connection is paused. The run gets the connection, its type and destination, and the vendor's details in data.",
  eventName: "pause_connector",
  sample: {
    event: "pause_connector",
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
