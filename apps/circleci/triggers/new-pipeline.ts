import { pollFromListAction } from "../../_shared/poll/mod.ts";
import pipelineList from "../actions/pipeline-list.ts";

export default pollFromListAction({
  key: "new-pipeline",
  title: "New Pipeline",
  description: "The run gets each newly created project pipeline.",
  action: pipelineList,
  input: (params: { projectSlug?: string; branch?: string }) => ({
    projectSlug: params.projectSlug,
    branch: params.branch,
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: pipelineList.params,
  output: [{ key: "id", type: "string", label: "Pipeline ID" }],
  sample: { id: "4b6f1d2e-1a11-4a37-b0ea-0c2cc018d3f9" },
  maxPages: 1,
});
