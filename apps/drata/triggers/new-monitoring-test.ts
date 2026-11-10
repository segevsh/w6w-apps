import monitoringTestList from "../actions/monitoring-test-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-monitoring-test",
  title: "New or Updated Monitoring Test",
  description: "The run gets each new or updated Drata monitoring test in a workspace.",
  action: monitoringTestList,
  params: [{ key: "workspaceId", label: "Workspace ID", type: "number", required: true }],
  input: (params, cursor) => ({
    workspaceId: params.workspaceId,
    size: 500,
    ...(cursor ? { cursor } : {}),
  }),
  idOf: (item) => String((item as { id?: unknown }).id),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1, name: "MFA test" } },
});
