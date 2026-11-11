import roleList from "../actions/role-list.ts";
import { rowsOf, snapshotTrigger, str, WHOLE_LIST } from "../lib/triggers.ts";

// GET /api/v2/roles?page=…&per_page=100 — "Get roles": no documented order, so the tenant's roles
// are snapshot-diffed (additions only; more than 5000 throws)
// (https://auth0.com/docs/api/management/v2/roles/get-roles).
export default snapshotTrigger({
  key: "new-role",
  title: "New Role",
  description: "The run gets each role newly created in the Auth0 tenant.",
  output: [
    { key: "id", type: "string", label: "Role ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
  ],
  sample: { id: "rol_abc123", name: "admin", description: "Administrators" },
  rows: async (_params, ctx) =>
    rowsOf("roles")(await roleList.execute({ ...WHOLE_LIST } as never, ctx)),
  idOf: (item) => str((item as { id?: unknown }).id),
});
