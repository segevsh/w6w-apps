import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import organizationMembershipList from "../actions/organization-membership-list.ts";

// WorkOS: GET /user_management/organization_memberships
// `order=desc` is "ordered by the creation time", newest first (https://workos.com/docs/reference/user-management/organization-membership/list, verified 2026-11-10).
// Newest-first, brief 9.1 a.
export default pollFromListAction<{ organizationId: string }>({
  key: "new-organization-membership",
  title: "New Organization Membership",
  description:
    "The run gets each new membership (active or pending invitation) in the chosen organization.",
  action: organizationMembershipList as unknown as ActionDefinition,
  input: ({ organizationId }) => ({ organizationId, statuses: "", order: "desc", limit: 50 }),
  items: (result) => (result as { memberships?: unknown[] }).memberships ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "organizationId", label: "Organization ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "user_id", type: "string", label: "User ID" },
    { key: "organization_id", type: "string", label: "Organization ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "om_01SAMPLE",
    user_id: "user_01SAMPLE",
    organization_id: "org_01SAMPLE",
    status: "active",
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
