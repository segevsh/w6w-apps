import { snykWindow } from "../lib/triggers.ts";
import action from "../actions/target-list.ts";

/**
 * `GET /rest/orgs/{org_id}/targets` (`getOrgsTargets`) documents `created_gte` ("targets created at or
 * after the specified date") and no sort, so this is the since-filter shape; `target-list` with
 * `returnAll` drains the window (https://api.snyk.io/rest/openapi/2026-03-25, verified 2026-11-10).
 */
export default snykWindow({
  key: "new-target",
  title: "New Target",
  description: "The run gets each repository or source newly imported into the organization.",
  action,
  params: (action.params ?? []).filter((p) => p.key === "orgId"),
  filter: "createdGte",
  stamp: "created_at",
  output: [
    { key: "id", type: "string", label: "Target ID" },
    { key: "type", type: "string", label: "Resource type" },
    {
      key: "attributes",
      type: "object",
      label: "Target attributes (display_name, url, is_private, created_at)",
    },
  ],
  sample: {
    id: "b2c3d4e5-0000-4000-8000-000000000002",
    type: "target",
    attributes: {
      display_name: "snyk-fixtures/goof",
      url: "http://github.com/snyk-fixtures/goof",
      is_private: false,
      created_at: "2026-11-09T09:00:00Z",
    },
  },
});
