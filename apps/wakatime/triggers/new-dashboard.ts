import { snapshotTrigger } from "../lib/snapshot.ts";
import dashboardList from "../actions/dashboard-list.ts";

/**
 * `GET /api/v1/users/current/orgs/:org/dashboards` (https://wakatime.com/developers#dashboards, 2026-11-10) lists one organization's
 * dashboards: a small collection (page 1 holds it all), so each check reads it and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-dashboard",
  title: "New Organization Dashboard",
  description: "The run gets each dashboard newly created in the organization.",
  action: dashboardList as never,
  params: [{
    key: "orgId",
    label: "Organization ID",
    type: "string",
    required: true,
    placeholder: "org-sample",
    hint: "The organization whose dashboards to watch (see List organizations).",
  }],
  input: (p) => ({ orgId: p.orgId }),
  items: (r) => (r as { data?: unknown[] } | undefined)?.data ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Dashboard ID" },
    { key: "full_name", type: "string", label: "Name" },
    { key: "created_by", type: "string", label: "Created by" },
    { key: "members_count", type: "number", label: "Members" },
  ],
  sample: {
    id: "dashboard-sample",
    full_name: "Engineering",
    created_by: "Jane",
    members_count: 8,
  },
});
