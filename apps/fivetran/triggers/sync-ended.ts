import { webhookTrigger } from "../lib/triggers.ts";

/** A sync of a connection ends, successfully or not. */
const syncEnded = webhookTrigger({
  key: "sync-ended",
  title: "Sync Ended",
  description:
    "Fires when a connection's sync ends. The run gets the connection, its type and destination, the sync id and the outcome in data.status.",
  eventName: "sync_end",
  sample: {
    event: "sync_end",
    created: "2026-11-10T09:30:00.386Z",
    connectorType: "postgres",
    connectorId: "mystified_presiding",
    connectorName: "mystified_presiding",
    syncId: "7b2c4e1a-0d3f-4a55-9a1e-5f6b7c8d9e0f",
    destinationGroupId: "deck_enjoy",
    data: { status: "SUCCESSFUL" },
  },
});

export default syncEnded;
