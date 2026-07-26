import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  issueNumber: number;
  lockReason?: string;
}

const issueLock: ActionDefinition<Input> = {
  key: "issue-lock",
  type: "perform",
  resource: "issue",
  title: "Lock Issue",
  description: "Lock an issue's conversation so only collaborators can comment.",
  idempotent: true,
  params: [
    owner,
    repository,
    { key: "issueNumber", label: "Issue number", type: "number", required: true },
    {
      key: "lockReason",
      label: "Reason",
      type: "select",
      options: [
        { value: "off-topic", label: "Off topic" },
        { value: "too heated", label: "Too heated" },
        { value: "resolved", label: "Resolved" },
        { value: "spam", label: "Spam" },
      ],
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/issues/${input.issueNumber}/lock`,
      { method: "PUT", body: { lock_reason: unset(input.lockReason) } },
    );
  },
};

export default issueLock;
