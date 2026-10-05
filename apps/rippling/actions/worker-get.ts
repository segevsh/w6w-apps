import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "worker-get",
  resource: "worker",
  title: "Get Worker",
  description: "Retrieve one worker by id.",
  path: "/workers",
  scope: "workers.read",
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
});
