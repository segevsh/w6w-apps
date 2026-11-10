import { PAGE_SIZE, snapshotTrigger } from "../lib/snapshot.ts";
import milestoneList from "../actions/milestone-list.ts";

export default snapshotTrigger({
  key: "new-milestone",
  title: "New Milestone",
  description: "The run gets each newly created milestone (stage) of the chosen pipeline.",
  params: [
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "string",
      required: true,
      hint: "The pipeline whose milestones to watch (see List Pipelines).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Milestone ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 34, name: "Proposal" },
  async load(params, page, ctx) {
    const pipelineId = Number(params.pipelineId);
    if (!Number.isInteger(pipelineId)) throw new Error("pipelineId must be a numeric pipeline id");
    const res = await milestoneList.execute({ pipelineId, page, perPage: PAGE_SIZE }, ctx) as {
      milestones?: Array<Record<string, unknown>>;
      nextPage?: number;
    };
    return { rows: res.milestones ?? [], nextPage: res.nextPage };
  },
});
