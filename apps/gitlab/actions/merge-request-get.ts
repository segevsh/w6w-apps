import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, projectPath } from "../lib/client.ts";
import { mergeRequestOutput, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  mergeRequestIid: number;
}

const mergeRequestGet: ActionDefinition<Input> = {
  key: "merge-request-get",
  type: "read",
  resource: "mergeRequest",
  title: "Get Merge Request",
  description: "Fetch one merge request by its project-scoped IID.",
  params: [
    projectId,
    {
      key: "mergeRequestIid",
      label: "Merge request IID",
      type: "number",
      required: true,
      hint: "The per-project MR number shown as `!123`, not the global ID.",
    },
  ],
  output: mergeRequestOutput,

  execute(input, ctx) {
    return new GitLabClient(ctx).request(
      `/projects/${projectPath(input.projectId)}/merge_requests/${input.mergeRequestIid}`,
    );
  },
};

export default mergeRequestGet;
