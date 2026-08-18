import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";

/**
 * `GET /v1/issues/{issueId}` — one item of work in full.
 *
 * The fields that matter when syncing into a ticketing system are the ones that
 * survive the round trip: the **readable issue id** (which is what a person
 * quotes, unlike the opaque one), the source that raised it, and the controls
 * it maps to — because a ticket that says which compliance requirement it
 * threatens gets prioritised differently from one that does not.
 */
const action: ActionDefinition = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get an issue",
  description:
    "One issue, with the readable id a person quotes and the controls it maps to — a ticket " +
    "naming the requirement it threatens gets prioritised differently.",
  params: [
    { key: "issueId", label: "Issue ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Issue ID" },
    { key: "readableIssueId", type: "string", label: "The id a person quotes" },
    { key: "status", type: "string", label: "Status" },
    { key: "severity", type: "string", label: "Severity" },
    { key: "dueDate", type: "string", label: "Due date" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const issueId = String(p.issueId ?? "").trim();
    if (!issueId) throw new Error("`issueId` is required");
    return await new VantaClient(ctx).request(`/issues/${encodeURIComponent(issueId)}`);
  },
};

export default action;
