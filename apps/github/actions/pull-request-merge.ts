import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  pullRequestNumber: number;
  mergeMethod?: string;
  commitTitle?: string;
  commitMessage?: string;
  sha?: string;
}

const pullRequestMerge: ActionDefinition<Input> = {
  key: "pull-request-merge",
  type: "perform",
  resource: "pullRequest",
  title: "Merge Pull Request",
  description: "Merge a pull request using the merge, squash or rebase strategy.",
  // An already-merged PR is rejected rather than merged twice, and the optional
  // SHA makes it an explicit compare-and-set.
  idempotent: true,
  params: [
    owner,
    repository,
    { key: "pullRequestNumber", label: "PR number", type: "number", required: true },
    {
      key: "mergeMethod",
      label: "Method",
      type: "select",
      default: "merge",
      options: [
        { value: "merge", label: "Merge commit" },
        { value: "squash", label: "Squash and merge" },
        { value: "rebase", label: "Rebase and merge" },
      ],
    },
    { key: "commitTitle", label: "Commit title", type: "string" },
    { key: "commitMessage", label: "Commit message", type: "text", config: { multiline: true } },
    {
      key: "sha",
      label: "Expected head SHA",
      type: "string",
      hint: "Refuse the merge if the PR head has moved since. Recommended for automation.",
    },
  ],
  output: [
    { key: "sha", type: "string", label: "Merge commit SHA" },
    { key: "merged", type: "boolean", label: "Merged" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/pulls/${input.pullRequestNumber}/merge`,
      {
        method: "PUT",
        body: {
          merge_method: unset(input.mergeMethod),
          commit_title: unset(input.commitTitle),
          commit_message: unset(input.commitMessage),
          sha: unset(input.sha),
        },
      },
    );
  },
};

export default pullRequestMerge;
