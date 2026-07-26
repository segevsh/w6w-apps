import type { ActionDefinition } from "@w6w/types";
import { adf, JiraClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  summary?: string;
  description?: string;
  assigneeId?: string;
  priority?: string;
  labels?: string;
  additionalFields?: unknown;
}

/**
 * Jira answers a successful issue PUT with 204 and no body — read the issue
 * back with `issue-get` if you need the updated object.
 */
const issueUpdate: ActionDefinition<Input> = {
  key: "issue-update",
  type: "perform",
  resource: "issue",
  title: "Update Issue",
  description:
    "Update an issue's fields. Jira answers 204 with no body — use `issue-get` to read the result back. Changing status is `issue-transition`.",
  // A PUT writes absolute values, so replaying converges.
  idempotent: true,
  params: [
    issueKey,
    { key: "summary", label: "Summary", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "assigneeId", label: "Assignee account ID", type: "string" },
    { key: "priority", label: "Priority", type: "string" },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      hint: "Comma-separated. REPLACES the issue's current labels.",
    },
    { key: "additionalFields", label: "Additional fields", type: "json", advanced: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    const labels = input.labels
      ? input.labels.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const fields: Record<string, unknown> = {
      ...(input.additionalFields as Record<string, unknown> ?? {}),
    };
    if (input.summary) fields.summary = input.summary;
    if (input.description) fields.description = adf(input.description);
    if (input.assigneeId) fields.assignee = { id: input.assigneeId };
    if (input.priority) fields.priority = { name: input.priority };
    if (labels?.length) fields.labels = labels;

    if (!Object.keys(fields).length) {
      throw new Error("Nothing to update — fill in at least one field.");
    }
    return new JiraClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}`, {
      method: "PUT",
      body: { fields },
    });
  },
};

export default issueUpdate;
