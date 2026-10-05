import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "worker-list",
  resource: "worker",
  title: "List Workers",
  description:
    "A worker is a person's HR profile (employment or engagement) in the company. Returns one page, forward-paginated.",
  path: "/workers/",
  scope: "workers.read",
  filterable: ["status", "work_email", "user_id", "created_at", "updated_at"],
  expandable: [
    "user",
    "manager",
    "legal_entity",
    "employment_type",
    "compensation",
    "department",
    "teams",
    "level",
    "job_function",
    "custom_fields",
    "business_partners",
  ],
  sortable: ["id", "created_at", "updated_at"],
});
