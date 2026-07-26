import type { ActionDefinition } from "@w6w/types";
import { csv, GitHubClient, repoPath, unset } from "../lib/client.ts";
import { issueOutput, owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  title: string;
  body?: string;
  assignees?: string;
  labels?: string;
  milestone?: number;
}

const issueCreate: ActionDefinition<Input> = {
  key: "issue-create",
  type: "perform",
  resource: "issue",
  title: "Create Issue",
  description: "Open an issue on a repository.",
  // GitHub assigns a new issue number per call and offers no request key, so a
  // retry files a duplicate.
  idempotent: false,
  params: [
    owner,
    repository,
    { key: "title", label: "Title", type: "string", required: true },
    { key: "body", label: "Body", type: "text", config: { multiline: true }, hint: "Markdown." },
    {
      key: "assignees",
      label: "Assignees",
      type: "string",
      hint: "Comma-separated GitHub logins.",
    },
    { key: "labels", label: "Labels", type: "string", hint: "Comma-separated label names." },
    { key: "milestone", label: "Milestone number", type: "number" },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/issues`,
      {
        method: "POST",
        body: {
          title: input.title,
          body: unset(input.body),
          assignees: csv(input.assignees),
          labels: csv(input.labels),
          milestone: input.milestone,
        },
      },
    );
  },
};

export default issueCreate;
