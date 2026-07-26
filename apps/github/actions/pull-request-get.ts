import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  pullRequestNumber: number;
}

const pullRequestGet: ActionDefinition<Input> = {
  key: "pull-request-get",
  type: "read",
  resource: "pullRequest",
  title: "Get Pull Request",
  description: "Fetch a pull request, including its mergeability and diff counts.",
  params: [
    owner,
    repository,
    { key: "pullRequestNumber", label: "PR number", type: "number", required: true },
  ],
  output: [
    { key: "number", type: "number", label: "PR number" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
    { key: "merged", type: "boolean", label: "Merged" },
    { key: "mergeable", type: "boolean", label: "Mergeable" },
    { key: "html_url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/pulls/${input.pullRequestNumber}`,
    );
  },
};

export default pullRequestGet;
