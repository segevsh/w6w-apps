import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, projectPath, unset } from "../lib/client.ts";
import { mergeRequestOutput, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description?: string;
  removeSourceBranch?: boolean;
}

const mergeRequestCreate: ActionDefinition<Input> = {
  key: "merge-request-create",
  type: "perform",
  resource: "mergeRequest",
  title: "Create Merge Request",
  description: "Open a merge request from a source branch into a target branch.",
  // A new MR IID is assigned per call with no request key, so a retry opens a
  // duplicate (or is rejected as one already exists for the branch pair).
  idempotent: false,
  params: [
    projectId,
    {
      key: "sourceBranch",
      label: "Source branch",
      type: "string",
      required: true,
      row: "branches",
    },
    {
      key: "targetBranch",
      label: "Target branch",
      type: "string",
      required: true,
      row: "branches",
    },
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "Markdown.",
    },
    {
      key: "removeSourceBranch",
      label: "Remove source branch on merge",
      type: "boolean",
    },
  ],
  output: mergeRequestOutput,

  execute(input, ctx) {
    return new GitLabClient(ctx).request(
      `/projects/${projectPath(input.projectId)}/merge_requests`,
      {
        method: "POST",
        body: {
          source_branch: input.sourceBranch,
          target_branch: input.targetBranch,
          title: input.title,
          description: unset(input.description),
          remove_source_branch: input.removeSourceBranch,
        },
      },
    );
  },
};

export default mergeRequestCreate;
