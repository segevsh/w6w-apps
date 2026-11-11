import { PAGE_SIZE, snapshotTrigger } from "../lib/snapshot.ts";
import pipelineList from "../actions/pipeline-list.ts";

export default snapshotTrigger({
  key: "new-pipeline",
  title: "New Pipeline",
  description: "The run gets each newly created sales pipeline.",
  output: [
    { key: "id", type: "number", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 12, name: "Sales" },
  async load(_params, page, ctx) {
    const res = await pipelineList.execute({ page, perPage: PAGE_SIZE }, ctx) as {
      pipelines?: Array<Record<string, unknown>>;
      nextPage?: number;
    };
    return { rows: res.pipelines ?? [], nextPage: res.nextPage };
  },
});
