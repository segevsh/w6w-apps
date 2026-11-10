import type { ActionDefinition } from "@w6w/types";
import incidentEventList from "../actions/incident-event-list.ts";
import { idField, SNAPSHOT_PAGE_SIZE, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /v1/incidents/{incident_id}/events` has no sort or time filter; one incident's list is bounded, so diff the ids. */
export default snapshotTrigger({
  key: "new-incident-event",
  title: "New Incident Event",
  description:
    "The run gets each new timeline event (note, status change, update) on one incident.",
  action: incidentEventList as unknown as ActionDefinition,
  params: [{ key: "incident_id", label: "Incident ID", type: "string", required: true }],
  input: (params) => ({
    incident_id: params.incident_id,
    page_number: 1,
    page_size: SNAPSHOT_PAGE_SIZE,
  }),
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: "evt_1", type: "incident-events", created_at: "2026-11-10T09:00:00Z" },
});
