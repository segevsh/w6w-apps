import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import monitoringTestList from "../actions/monitoring-test-list.ts";

export default pollFromListAction({
  key: "new-monitoring-test",
  title: "New Monitoring Test",
  description: "The run gets each new monitoring test in the selected workspace.",
  action: monitoringTestList as unknown as ActionDefinition,
  input: (params) => ({ ...params, size: 100, sort: "createdAt", sortDir: "DESC" }),
  params: (monitoringTestList.params ?? []).filter((param) => ["workspaceId"].includes(param.key)),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Monitoring Test ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
