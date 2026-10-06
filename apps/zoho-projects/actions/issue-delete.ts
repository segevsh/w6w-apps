import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  issueId: string;
}

const issueDelete: ActionDefinition<Input> = {
  key: "issue-delete",
  type: "perform",
  resource: "issue",
  title: "Delete Issue",
  description: "Delete an issue (bug).",
  idempotent: true,
  params: [
    portalId,
    projectId,
    {
      key: "issueId",
      label: "Issue ID",
      type: "string",
      required: true,
      hint: "From the List Issues action.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "True once the vendor confirmed the delete" }],

  async execute(input, ctx) {
    await new ProjectsClient(ctx).request(
      "DELETE",
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/issues/${
        enc(input.issueId)
      }`,
    );
    return { deleted: true };
  },
};

export default issueDelete;
