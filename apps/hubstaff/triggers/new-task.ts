import { ORGANIZATION_ID_PARAM, snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/task-list.ts";

/** `GET /v2/organizations/{id}/tasks` — no sort or created-after filter is documented. */
export default snapshotFeed({
  key: "new-task",
  title: "New Task",
  description: "The run gets each task newly created in a Hubstaff organization.",
  action,
  params: [ORGANIZATION_ID_PARAM],
  input: ({ params, cursor, pageSize }) => ({
    organization_id: params.organizationId,
    page_limit: pageSize,
    page_start_id: cursor,
  }),
  items: (result) => (result as { tasks?: Array<Record<string, unknown>> }).tasks ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "status", type: "string", label: "Status" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "assignee_ids", type: "array", label: "Assignee user IDs" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 11223344,
    summary: "Fix the login redirect",
    status: "active",
    project_id: 841201,
    assignee_ids: [651956],
    created_at: "2026-11-09T10:00:00Z",
  },
});
