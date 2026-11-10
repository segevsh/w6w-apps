import { clerkNewest, ORGANIZATION_PARAM } from "../lib/triggers.ts";
import organizationMembershipList from "../actions/organization-membership-list.ts";

export default clerkNewest({
  key: "new-organization-membership",
  title: "New Organization Member",
  description: "The run gets each user newly added to the chosen organization.",
  action: organizationMembershipList,
  params: [ORGANIZATION_PARAM],
  input: (p) => ({ organizationId: p.organizationId, orderBy: "-created_at" }),
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "role", type: "string", label: "Role" },
    { key: "created_at", type: "number", label: "Created at (Unix ms)" },
  ],
  sample: { id: "orgmem_2abc123", role: "org:member", created_at: 1794128400000 },
});
