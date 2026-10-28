import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  milestoneId: string;
}

const milestoneGet: ActionDefinition<Input> = {
  key: "milestone-get",
  type: "read",
  resource: "milestone",
  title: "Get Milestone",
  description: "Fetch one milestone (phase). Uses the v3.1 endpoint.",
  params: [
    portalId,
    projectId,
    {
      key: "milestoneId",
      label: "Milestone ID",
      type: "string",
      required: true,
      hint: "From the List Milestones action.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).get(
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/phases/${
        enc(input.milestoneId)
      }`,
      undefined,
      "v3.1",
    );
    return { item: body };
  },
};

export default milestoneGet;
