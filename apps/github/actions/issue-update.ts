import type { ActionDefinition } from "@w6w/types";
import { csv, GitHubClient, repoPath, unset } from "../lib/client.ts";
import { issueOutput, owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  issueNumber: number;
  title?: string;
  body?: string;
  state?: string;
  stateReason?: string;
  assignees?: string;
  labels?: string;
}

const issueUpdate: ActionDefinition<Input> = {
  key: "issue-update",
  type: "perform",
  resource: "issue",
  title: "Update Issue",
  description: "Edit an issue — retitle it, rewrite the body, close or reopen it, set labels.",
  // A PATCH writes absolute values, so replaying converges on the same issue.
  idempotent: true,
  params: [
    owner,
    repository,
    { key: "issueNumber", label: "Issue number", type: "number", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "body", label: "Body", type: "text", config: { multiline: true } },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      key: "stateReason",
      label: "State reason",
      type: "select",
      showIf: { field: "state", eq: "closed" },
      options: [
        { value: "completed", label: "Completed" },
        { value: "not_planned", label: "Not planned" },
        { value: "duplicate", label: "Duplicate" },
      ],
    },
    {
      key: "assignees",
      label: "Assignees",
      type: "string",
      hint: "Comma-separated logins. REPLACES the current assignees.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      hint: "Comma-separated names. REPLACES the current labels.",
    },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/issues/${input.issueNumber}`,
      {
        method: "PATCH",
        body: {
          title: unset(input.title),
          body: unset(input.body),
          state: unset(input.state),
          state_reason: unset(input.stateReason),
          assignees: csv(input.assignees),
          labels: csv(input.labels),
        },
      },
    );
  },
};

export default issueUpdate;
