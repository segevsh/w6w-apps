import evidenceList from "../actions/evidence-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-evidence",
  title: "New or Updated Evidence",
  description: "The run gets each new or updated Drata evidence item in a workspace.",
  action: evidenceList,
  params: [{ key: "workspaceId", label: "Workspace ID", type: "number", required: true }],
  input: (params, cursor) => ({
    workspaceId: params.workspaceId,
    size: 500,
    ...(cursor ? { cursor } : {}),
  }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, name: "Policy export" } },
});
