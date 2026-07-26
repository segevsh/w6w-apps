import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  issueNumber: number;
  body: string;
}

/**
 * Also comments on pull requests: on GitHub a PR *is* an issue, and its
 * conversation-tab comments live on the issues endpoint. (Comments anchored to
 * a diff line are a different resource — see `pull-request-create-review`.)
 */
const issueComment: ActionDefinition<Input> = {
  key: "issue-comment",
  type: "perform",
  resource: "issue",
  title: "Comment on Issue",
  description: "Post a comment on an issue or on a pull request's conversation.",
  idempotent: false,
  params: [
    owner,
    repository,
    {
      key: "issueNumber",
      label: "Issue or PR number",
      type: "number",
      required: true,
      hint: "Pull requests share the issue numbering.",
    },
    { key: "body", label: "Comment", type: "text", required: true, config: { multiline: true } },
  ],
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "html_url", type: "string", label: "URL" },
    { key: "body", type: "string", label: "Body" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/issues/${input.issueNumber}/comments`,
      { method: "POST", body: { body: input.body } },
    );
  },
};

export default issueComment;
