import workspaceList from "../actions/workspace-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-workspace",
  title: "New or Updated Workspace",
  description: "The run gets each new or updated Drata workspace.",
  action: workspaceList,
  input: (_params, cursor) => ({ size: 500, ...(cursor ? { cursor } : {}) }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, name: "Production" } },
});
