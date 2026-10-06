import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  milestoneId: string;
}

const milestoneDelete: ActionDefinition<Input> = {
  key: "milestone-delete",
  type: "perform",
  resource: "milestone",
  title: "Delete Milestone",
  description: "Delete a milestone (phase). Uses the v3.1 endpoint.",
  idempotent: true,
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
  output: [{ key: "deleted", type: "boolean", label: "True once the vendor confirmed the delete" }],

  async execute(input, ctx) {
    await new ProjectsClient(ctx).request(
      "DELETE",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/phases/${
        enc(input.milestoneId)
      }`,
      { version: "v3.1" },
    );
    return { deleted: true };
  },
};

export default milestoneDelete;
