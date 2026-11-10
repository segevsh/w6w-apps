import organizationMemberList from "../actions/organization-member-list.ts";
import { rowsOf, snapshotTrigger, str, WHOLE_LIST } from "../lib/triggers.ts";

// GET /api/v2/organizations/{id}/members?page=…&per_page=100 — "Get organization members": no
// documented order, so the organization's members are snapshot-diffed (additions only; more than
// 5000 throws) (https://auth0.com/docs/api/management/v2/organizations/get-members).
export default snapshotTrigger({
  key: "new-organization-member",
  title: "New Organization Member",
  description: "The run gets each user who becomes a member of the chosen organization.",
  params: [{
    key: "organizationId",
    label: "Organization ID",
    type: "string",
    required: true,
    placeholder: "org_abc123",
    hint: "The organization to watch.",
  }],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { user_id: "auth0|65f1c2d3e4f5a6b7c8d9e0f1", email: "ada@example.com", name: "Ada" },
  rows: async (params, ctx) =>
    rowsOf("members")(
      await organizationMemberList.execute({
        ...WHOLE_LIST,
        organizationId: str(params.organizationId),
        includeRoles: false,
      } as never, ctx),
    ),
  idOf: (item) => str((item as { user_id?: unknown }).user_id),
});
