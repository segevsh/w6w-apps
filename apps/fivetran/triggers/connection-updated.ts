import { webhookTrigger } from "../lib/triggers.ts";

/** Connection Updated: Fivetran event `edit_connector`. */
const trigger = webhookTrigger({
  key: "connection-updated",
  title: "Connection Updated",
  description:
    "Fires when a connection's configuration is edited. The run gets the connection, its type and destination, and the vendor's details in data.",
  eventName: "edit_connector",
  sample: {
    event: "edit_connector",
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
