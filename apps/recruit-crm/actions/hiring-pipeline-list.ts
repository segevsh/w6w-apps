import type { ActionDefinition } from "@w6w/types";
import { recordsOf, RecruitClient } from "../lib/client.ts";

const hiringPipelineList: ActionDefinition<Record<string, never>> = {
  key: "hiring-pipeline-list",
  type: "read",
  resource: "hiring-pipeline",
  title: "Get Hiring Pipeline",
  description:
    "The candidate hiring stages (`stage_id` + `label`) the Update Candidate Hiring Stage action needs (`GET /v1/hiring-pipeline`).",
  params: [],
  output: [{ key: "items", type: "array", label: "Stages ({stage_id, label})" }],

  async execute(_input, ctx) {
    const raw = await new RecruitClient(ctx).json<unknown>("/hiring-pipeline");
    return { items: recordsOf(raw) };
  },
};

export default hiringPipelineList;
