import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "leave-request-list",
  resource: "leave-request",
  title: "List Leave Requests",
  description: "Time-off requests. Returns one page, forward-paginated.",
  path: "/leave-requests/",
  scope: "leave-requests.read",
  filterable: [
    "worker_id",
    "requester_id",
    "reviewer_id",
    "status",
    "leave_policy_id",
    "leave_type_id",
    "start_date",
    "end_date",
  ],
  expandable: ["worker", "requester", "leave_type", "reviewer"],
  sortable: ["id", "created_at", "updated_at"],
});
