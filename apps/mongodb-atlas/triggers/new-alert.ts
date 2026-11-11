import { PROJECT_ID_PARAM, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/alert-list.ts";

export default snapshotTrigger({
  key: "new-alert",
  title: "New Alert",
  description:
    "The run gets each alert newly OPEN in the chosen project, polled from the existing `alert-list` action with `status=OPEN` (the whole open set, diffed by alert id).",
  action,
  listKey: "alerts",
  input: (params) => ({ projectId: params.projectId, status: "OPEN" }),
  idOf: (item) => item.id,
  params: [PROJECT_ID_PARAM],
  output: [
    { key: "id", type: "string", label: "Alert ID" },
    { key: "eventTypeName", type: "string", label: "Condition that fired" },
    { key: "status", type: "string", label: "Status" },
    { key: "created", type: "string", label: "Created at" },
  ],
  sample: {
    id: "5f8d0d55b54eff0f2b2c3d50",
    eventTypeName: "HOST_DOWN",
    status: "OPEN",
    created: "2026-11-09T10:00:00Z",
  },
});
