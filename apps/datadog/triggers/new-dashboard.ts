import { snapshotFeed } from "../lib/triggers.ts";
import dashboardList from "../actions/dashboard-list.ts";

/**
 * Wraps `dashboard-list` (`GET /api/v1/dashboard`, `count` + `start` offset). No sort or filter on
 * creation exists, so the custom and cloned dashboards are walked 100 at a time and diffed.
 */
export default snapshotFeed({
  key: "new-dashboard",
  title: "New Dashboard",
  description: "The run gets each custom or cloned Datadog dashboard newly created.",
  action: dashboardList,
  pageSize: 100,
  input: ({ cursor, pageSize }) => ({ count: pageSize, start: cursor * pageSize }),
  items: (result) => (result as { dashboards?: Array<Record<string, unknown>> }).dashboards ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Dashboard ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "author_handle", type: "string", label: "Author" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "modified_at", type: "string", label: "Last modified at" },
    { key: "url", type: "string", label: "Dashboard path" },
  ],
  sample: {
    id: "abc-def-ghi",
    title: "Service overview",
    author_handle: "ops@example.com",
    created_at: "2026-11-09T10:00:00.000000+00:00",
    modified_at: "2026-11-09T10:00:00.000000+00:00",
    url: "/dashboard/abc-def-ghi/service-overview",
  },
});
