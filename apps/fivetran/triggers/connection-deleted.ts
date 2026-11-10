import { webhookTrigger } from "../lib/triggers.ts";

/** Connection Deleted: Fivetran event `delete_connector`. */
const trigger = webhookTrigger({
  key: "connection-deleted",
  title: "Connection Deleted",
  description:
    "Fires when a connection is deleted. The run gets the connection, its type and destination, and the vendor's details in data.",
  eventName: "delete_connector",
  sample: {
    event: "delete_connector",
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
