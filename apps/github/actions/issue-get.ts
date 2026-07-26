import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { issueOutput, owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  issueNumber: number;
}

const issueGet: ActionDefinition<Input> = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get Issue",
  description: "Fetch one issue by number.",
  params: [
    owner,
    repository,
    { key: "issueNumber", label: "Issue number", type: "number", required: true },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/issues/${input.issueNumber}`,
    );
  },
};

export default issueGet;
