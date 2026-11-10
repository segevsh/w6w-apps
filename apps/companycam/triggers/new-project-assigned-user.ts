import type { ActionDefinition } from "@w6w/types";
import projectAssignedUserList from "../actions/project-assigned-user-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/projects/{id}/assigned_users` for the project the user picks; a project has a handful
// of assignees, snapshotted each check (brief 9.1c).
export default snapshotTrigger<{ projectId: string }>({
  key: "new-project-assigned-user",
  title: "New Project Assigned User",
  description: "The run gets each user newly assigned to one project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "The project to watch (its ID is in the project URL or a List Projects result).",
    },
  ],
  action: projectAssignedUserList as unknown as ActionDefinition,
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email_address", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "1001",
    first_name: "Ada",
    last_name: "Roe",
    email_address: "ada@example.com",
    status: "active",
    created_at: 1762646400,
    updated_at: 1762646400,
  },
});
