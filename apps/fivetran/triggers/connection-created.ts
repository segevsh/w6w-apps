import { webhookTrigger } from "../lib/triggers.ts";

/** Connection Created: Fivetran event `create_connector`. */
const trigger = webhookTrigger({
  key: "connection-created",
  title: "Connection Created",
  description:
    "Fires when a connection is created in the Fivetran account. The run gets the connection, its type and destination, and the vendor's details in data.",
  eventName: "create_connector",
  sample: {
    event: "create_connector",
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
