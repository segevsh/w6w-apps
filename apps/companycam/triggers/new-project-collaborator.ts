import type { ActionDefinition } from "@w6w/types";
import projectCollaboratorList from "../actions/project-collaborator-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/projects/{id}/collaborators` for the project the user picks; a project has a handful of
// collaborators, snapshotted each check (brief 9.1c).
export default snapshotTrigger<{ projectId: string }>({
  key: "new-project-collaborator",
  title: "New Project Collaborator",
  description: "The run gets each collaborator newly added to one project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "The project to watch (its ID is in the project URL or a List Projects result).",
    },
  ],
  action: projectCollaboratorList as unknown as ActionDefinition,
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "string", label: "Collaborator ID" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "company_id", type: "string", label: "Company ID" },
    { key: "accepted_at", type: "number", label: "Accepted (Unix seconds)" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "7001",
    project_id: "5001",
    company_id: "8001",
    project_invitation_id: "9001",
    accepted_at: 1762646400,
    created_at: 1762646400,
  },
});
