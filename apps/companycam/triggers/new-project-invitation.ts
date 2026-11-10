import type { ActionDefinition } from "@w6w/types";
import projectInvitationList from "../actions/project-invitation-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/projects/{id}/invitations` for the project the user picks; a project has a handful of
// invitations, snapshotted each check (brief 9.1c).
export default snapshotTrigger<{ projectId: string }>({
  key: "new-project-invitation",
  title: "New Project Invitation",
  description: "The run gets each invitation newly sent for one project.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "The project to watch (its ID is in the project URL or a List Projects result).",
    },
  ],
  action: projectInvitationList as unknown as ActionDefinition,
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "invite_url", type: "string", label: "Invite URL" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "9001",
    project_id: "5001",
    status: "pending",
    invite_url: "https://example.com/invite",
    created_at: 1762646400,
  },
});
