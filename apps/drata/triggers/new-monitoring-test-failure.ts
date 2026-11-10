import monitoringTestFailuresList from "../actions/monitoring-test-failures-list.ts";
import { snapshotOutput, snapshotTrigger } from "../lib/snapshot.ts";

export default snapshotTrigger({
  key: "new-monitoring-test-failure",
  title: "New or Updated Monitoring Test Failure",
  description: "The run gets each new or updated failing resource for a Drata monitoring test.",
  action: monitoringTestFailuresList,
  params: [{ key: "workspaceId", label: "Workspace ID", type: "number", required: true }, {
    key: "testId",
    label: "Monitoring Test ID",
    type: "number",
    required: true,
  }],
  input: (params, cursor) => ({
    workspaceId: params.workspaceId,
    testId: params.testId,
    size: 500,
    ...(cursor ? { cursor } : {}),
  }),
  idOf: (item) =>
    String(
      (item as { id?: unknown; resourceId?: unknown }).id ??
        (item as { resourceId?: unknown }).resourceId,
    ),
  output: snapshotOutput,
  sample: { change: "added", key: "1", values: { id: 1 } },
});
