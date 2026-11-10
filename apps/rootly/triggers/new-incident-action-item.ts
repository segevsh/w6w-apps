import type { ActionDefinition } from "@w6w/types";
import incidentActionItemList from "../actions/incident-action-item-list.ts";
import { idField, SNAPSHOT_PAGE_SIZE, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /v1/incidents/{incident_id}/action_items` has no sort or time filter; one incident's list is bounded, so diff the ids. */
export default snapshotTrigger({
  key: "new-incident-action-item",
  title: "New Incident Action Item",
  description: "The run gets each new action item (follow-up or task) on one incident.",
  action: incidentActionItemList as unknown as ActionDefinition,
  params: [{ key: "incident_id", label: "Incident ID", type: "string", required: true }],
  input: (params) => ({
    incident_id: params.incident_id,
    page_number: 1,
    page_size: SNAPSHOT_PAGE_SIZE,
  }),
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Action item ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: "ai_1", type: "incident-action-items", created_at: "2026-11-10T09:00:00Z" },
});
