import { webhookTrigger } from "../lib/triggers.ts";

/** A sync of a connection starts. */
const syncStarted = webhookTrigger({
  key: "sync-started",
  title: "Sync Started",
  description:
    "Fires when a connection starts a sync. The run gets the connection, its type and destination, the sync id and the event time.",
  eventName: "sync_start",
  sample: {
    event: "sync_start",
    created: "2026-11-10T09:30:00.386Z",
    connectorType: "postgres",
    connectorId: "mystified_presiding",
    connectorName: "mystified_presiding",
    syncId: "7b2c4e1a-0d3f-4a55-9a1e-5f6b7c8d9e0f",
    destinationGroupId: "deck_enjoy",
    data: {},
  },
});

export default syncStarted;
