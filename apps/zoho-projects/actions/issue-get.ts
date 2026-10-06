import type { ActionDefinition } from "@w6w/types";
import { enc, ProjectsClient } from "../lib/client.ts";
import { portalId, projectId } from "../lib/params.ts";

interface Input {
  portalId: string;
  projectId: string;
  issueId: string;
}

const issueGet: ActionDefinition<Input> = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get Issue",
  description: "Fetch one issue (bug).",
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
  output: [{ key: "item", type: "object", label: "Record" }],

  async execute(input, ctx) {
    const body = await new ProjectsClient(ctx).get(
      `/portal/${enc(input.portalId)}/projects/${enc(input.projectId)}/issues/${
        enc(input.issueId)
      }`,
    );
    return { item: body };
  },
};

export default issueGet;
