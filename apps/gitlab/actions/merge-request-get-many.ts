import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, projectPath, unset } from "../lib/client.ts";
import { mergeRequestOutput, pagination, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  state?: string;
  targetBranch?: string;
  perPage?: number;
  page?: number;
}

const mergeRequestGetMany: ActionDefinition<Input> = {
  key: "merge-request-get-many",
  type: "read",
  resource: "mergeRequest",
  title: "Get Many Merge Requests",
  description: "List a project's merge requests, optionally filtered by state or target branch.",
  params: [
    projectId,
    {
      key: "state",
      label: "State",
      type: "string",
      options: [
        { value: "opened", label: "Opened" },
        { value: "closed", label: "Closed" },
        { value: "merged", label: "Merged" },
        { value: "locked", label: "Locked" },
      ],
      hint: "Leave blank for all states.",
    },
    { key: "targetBranch", label: "Target branch", type: "string" },
    ...pagination,
  ],
  output: mergeRequestOutput,

  execute(input, ctx) {
    return new GitLabClient(ctx).request(
      `/projects/${projectPath(input.projectId)}/merge_requests`,
      {
        query: {
          state: unset(input.state),
          target_branch: unset(input.targetBranch),
          per_page: input.perPage,
          page: input.page,
        },
      },
    );
  },
};

export default mergeRequestGetMany;
