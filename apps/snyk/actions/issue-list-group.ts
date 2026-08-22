import type { ActionDefinition } from "@w6w/types";
import { csv, SnykClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /groups/{group_id}/issues` — verified against Snyk's own API document
 * (`listGroupIssues`).
 *
 * A **group** sits above organizations in Snyk's hierarchy, so this is the
 * cross-org view: "every critical issue in the company", which `issue-list`
 * cannot answer for more than one org at a time. It takes a group id rather
 * than the connection's org, so there is no org fallback here.
 */
const action: ActionDefinition = {
  key: "issue-list-group",
  type: "read",
  resource: "issue",
  title: "List a group's issues",
  description: "List issues across every organization in a group.",
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      required: true,
      default: "",
      hint: "A group sits above organizations — use List groups to find it.",
    },
    ...LIST_PARAMS,
    {
      key: "effectiveSeverityLevel",
      label: "Severity",
      type: "multiselect",
      default: [],
      options: [
        { value: "critical", label: "Critical" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
        { value: "info", label: "Info" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      default: [],
      options: [
        { value: "open", label: "Open" },
        { value: "resolved", label: "Resolved" },
      ],
    },
    { key: "type", label: "Type", type: "string", default: "" },
    { key: "updatedAfter", label: "Updated After", type: "datetime", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const groupId = String(p.groupId ?? "").trim();
    if (!groupId) throw new Error("`groupId` is required");

    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const query = {
      effective_severity_level: csv(p.effectiveSeverityLevel),
      status: csv(p.status),
      type: (p.type as string) || undefined,
      updated_after: (p.updatedAfter as string) || undefined,
    };

    ctx.log("info", "listing Snyk group issues", { groupId, returnAll, limit });

    return await new SnykClient(ctx).requestAll(
      `/groups/${encodeURIComponent(groupId)}/issues`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
