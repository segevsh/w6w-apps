import userRoleList from "../actions/user-role-list.ts";
import { rowsOf, snapshotTrigger, str, WHOLE_LIST } from "../lib/triggers.ts";

// GET /api/v2/users/{id}/roles?page=…&per_page=100 — "Get user roles": no documented order, so the
// user's roles are snapshot-diffed (additions only; more than 5000 throws), i.e. the run starts when
// the chosen user is assigned a role (https://auth0.com/docs/api/management/v2/users/get-user-roles).
export default snapshotTrigger({
  key: "new-user-role",
  title: "Role Assigned to User",
  description: "The run gets each tenant-level role newly assigned to the chosen user.",
  params: [{
    key: "userId",
    label: "User ID",
    type: "string",
    required: true,
    placeholder: "auth0|65f1c2d3e4f5a6b7c8d9e0f1",
    hint: "The user whose role assignments to watch.",
  }],
  output: [
    { key: "id", type: "string", label: "Role ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
  ],
  sample: { id: "rol_abc123", name: "admin", description: "Administrators" },
  rows: async (params, ctx) =>
    rowsOf("roles")(
      await userRoleList.execute({ ...WHOLE_LIST, userId: str(params.userId) } as never, ctx),
    ),
  idOf: (item) => str((item as { id?: unknown }).id),
});
