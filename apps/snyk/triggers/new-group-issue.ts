import { snykWindow } from "../lib/triggers.ts";
import action from "../actions/issue-list-group.ts";

/**
 * `GET /rest/groups/{group_id}/issues` (`listGroupIssues`) documents `created_after` / `updated_after`
 * and no sort, so this is the since-filter shape; `issue-list-group` with `returnAll` drains the window
 * (https://api.snyk.io/rest/openapi/2026-03-25, verified 2026-11-10).
 */
export default snykWindow({
  key: "new-group-issue",
  title: "New Group Issue",
  description: "The run gets each issue Snyk newly finds in any organization of the group.",
  action,
  params: (action.params ?? []).filter((p) => p.key === "groupId"),
  filter: "createdAfter",
  stamp: "created_at",
  output: [
    { key: "id", type: "string", label: "Issue ID" },
    { key: "type", type: "string", label: "Resource type" },
    {
      key: "attributes",
      type: "object",
      label: "Issue attributes (title, effective_severity_level, status, created_at, updated_at)",
    },
  ],
  sample: {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    type: "issue",
    attributes: {
      title: "Prototype Pollution",
      effective_severity_level: "high",
      status: "open",
      created_at: "2026-11-08T09:00:00Z",
      updated_at: "2026-11-08T09:00:00Z",
    },
  },
});
