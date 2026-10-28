import type { ActionDefinition } from "@w6w/types";
import { JiraClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  accountId?: string;
}

const issueAssign: ActionDefinition<Input> = {
  key: "issue-assign",
  type: "perform",
  resource: "issue",
  title: "Assign Issue",
  description: "Assign an issue to a user, or leave the account id empty to unassign it.",
  idempotent: true,
  params: [
    issueKey,
    {
      key: "accountId",
      label: "Assignee account ID",
      type: "string",
      hint: "Atlassian account id from `user-search`. Leave empty to unassign.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new JiraClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}/assignee`, {
      method: "PUT",
      // Explicit null is how Jira unassigns; omitting the key would be a no-op.
      body: { accountId: input.accountId || null },
    });
  },
};

export default issueAssign;
