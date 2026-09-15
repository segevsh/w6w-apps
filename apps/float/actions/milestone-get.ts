import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /v3/milestones/{milestone_id}` — retrieve a single milestone. */
interface Input {
  milestone_id: number;
}

const milestoneGet: ActionDefinition<Input> = {
  key: "milestone-get",
  type: "read",
  resource: "milestone",
  title: "Get Milestone",
  description: "Retrieve a single milestone by ID.",
  params: [idParam("milestone_id", "Milestone ID")],
  output: [
    { key: "milestone_id", type: "number", label: "Milestone ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_id", type: "number", label: "Project ID" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(`/milestones/${input.milestone_id}`);
  },
};

export default milestoneGet;
