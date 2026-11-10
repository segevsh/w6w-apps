import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/workflow-run-list.ts";

export default pollFromListAction({
  key: "new-workflow-run",
  title: "New Workflow Run",
  description: "The run gets each newly created workflow run.",
  action,
  input: () => ({}),
  items: (r) => (r as { workflowRuns?: unknown[] }).workflowRuns ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Workflow run ID" }],
  sample: { id: "run-2" },
  maxPages: 1,
});
