import { webhookTrigger } from "../lib/triggers.ts";

/** Connection Successful: Fivetran event `connection_successful`. */
const trigger = webhookTrigger({
  key: "connection-successful",
  title: "Connection Successful",
  description:
    "Fires when a connection reports success on its setup check (the counterpart of Connection Failure). The run gets the connection, its type and destination, and the vendor's details in data.",
  eventName: "connection_successful",
  sample: {
    event: "connection_successful",
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
