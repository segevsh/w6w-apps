import controlList from "../actions/control-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-control",
  title: "New or Updated Control",
  description: "The run gets each new or updated Drata control in a workspace.",
  action: controlList,
  params: [{ key: "workspaceId", label: "Workspace ID", type: "number", required: true }],
  input: (params, cursor) => ({
    workspaceId: params.workspaceId,
    size: 500,
    ...(cursor ? { cursor } : {}),
  }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, name: "Access control" } },
});
