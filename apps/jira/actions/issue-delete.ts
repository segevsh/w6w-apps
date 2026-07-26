import type { ActionDefinition } from "@w6w/types";
import { JiraClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  deleteSubtasks?: boolean;
}

/**
 * Permanent — Jira has no trash for issues. Most workflows should transition
 * the issue to a Done/Closed status instead.
 */
const issueDelete: ActionDefinition<Input> = {
  key: "issue-delete",
  type: "perform",
  resource: "issue",
  title: "Delete Issue",
  description:
    "Permanently delete an issue. Jira has no trash — prefer transitioning it to Done unless you mean it.",
  idempotent: true,
  params: [
    issueKey,
    {
      key: "deleteSubtasks",
      label: "Delete sub-tasks",
      type: "boolean",
      hint: "Required when the issue has sub-tasks; Jira refuses otherwise.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new JiraClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}`, {
      method: "DELETE",
      query: { deleteSubtasks: input.deleteSubtasks },
    });
  },
};

export default issueDelete;
