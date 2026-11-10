import { webhookTrigger } from "../lib/triggers.ts";

/** A connection's setup check fails. */
const connectionFailure = webhookTrigger({
  key: "connection-failure",
  title: "Connection Failure",
  description:
    "Fires when a connection reports a failure. The run gets the connection, its type and destination, and the vendor's details in data.",
  eventName: "connection_failure",
  sample: {
    event: "connection_failure",
    created: "2026-11-10T09:30:00.386Z",
    connectorType: "postgres",
    connectorId: "mystified_presiding",
    connectorName: "mystified_presiding",
    syncId: "7b2c4e1a-0d3f-4a55-9a1e-5f6b7c8d9e0f",
    destinationGroupId: "deck_enjoy",
    data: {},
  },
});

export default connectionFailure;
