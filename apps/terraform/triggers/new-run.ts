import { pollFromListAction } from "../../_shared/poll/mod.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import runList from "../actions/run-list.ts";

export default pollFromListAction({
  key: "new-run",
  title: "New Run",
  description: "The run gets each newly created Terraform run in the selected workspace.",
  action: runList,
  params: WORKSPACE_PARAMS,
  input: (params: Record<string, unknown>) => ({ ...params, page: 1, pageSize: 100 }),
  items: (result) => (result as { runs?: unknown[] }).runs ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Run ID" }],
  sample: { id: "run-101", status: "planned" },
  maxPages: 1,
});
