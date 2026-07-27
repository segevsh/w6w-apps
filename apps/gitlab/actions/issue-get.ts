import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, projectPath } from "../lib/client.ts";
import { issueOutput, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  issueIid: number;
}

const issueGet: ActionDefinition<Input> = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get Issue",
  description: "Fetch one issue by its project-scoped IID.",
  params: [
    projectId,
    {
      key: "issueIid",
      label: "Issue IID",
      type: "number",
      required: true,
      hint: "The per-project issue number shown as `#123`, not the global ID.",
    },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new GitLabClient(ctx).request(
      `/projects/${projectPath(input.projectId)}/issues/${input.issueIid}`,
    );
  },
};

export default issueGet;
