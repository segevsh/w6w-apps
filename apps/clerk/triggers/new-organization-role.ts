import { clerkNewest } from "../lib/triggers.ts";
import organizationRoleList from "../actions/organization-role-list.ts";

export default clerkNewest({
  key: "new-organization-role",
  title: "New Organization Role",
  description: "The run gets each newly created organization role.",
  action: organizationRoleList,
  input: () => ({}),
  output: [
    { key: "id", type: "string", label: "Role ID" },
    { key: "key", type: "string", label: "Key" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "number", label: "Created at (Unix ms)" },
  ],
  sample: { id: "role_2abc123", key: "org:editor", name: "Editor", created_at: 1794128400000 },
});
