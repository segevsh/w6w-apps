import type { ActionDefinition } from "@w6w/types";
import { LinearClient } from "../lib/client.ts";

const MUTATION = `
  mutation IssueDelete($id: String!) {
    issueDelete(id: $id) { success }
  }
`;

/**
 * Linear's `issueDelete` moves the issue to trash rather than erasing it — it
 * can be restored from the UI for a while afterwards.
 */
const issueDelete: ActionDefinition<{ issueId: string }> = {
  key: "issue-delete",
  type: "perform",
  resource: "issue",
  title: "Delete Issue",
  description: "Move an issue to trash. It can be restored from Linear's UI.",
  idempotent: true,
  params: [{ key: "issueId", label: "Issue ID", type: "string", required: true }],
  output: [{ key: "issueDelete.success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new LinearClient(ctx).query(MUTATION, { id: input.issueId });
  },
};

export default issueDelete;
