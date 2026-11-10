import { clerkNewest, ORGANIZATION_PARAM } from "../lib/triggers.ts";
import organizationInvitationList from "../actions/organization-invitation-list.ts";

export default clerkNewest({
  key: "new-organization-invitation",
  title: "New Organization Invitation",
  description: "The run gets each newly created invitation to the chosen organization.",
  action: organizationInvitationList,
  params: [ORGANIZATION_PARAM],
  input: (p) => ({ organizationId: p.organizationId }),
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created at (Unix ms)" },
  ],
  sample: {
    id: "orginv_2abc123",
    email_address: "ada@example.com",
    status: "pending",
    created_at: 1794128400000,
  },
});
