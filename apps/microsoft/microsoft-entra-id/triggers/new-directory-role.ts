import listDirectoryRoles from "../actions/list-directory-roles.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/api/directoryrole-list (verified 2026-11-10): lists the
// activated roles (a few dozen at most) with no `$top`/`$orderby`; read whole and diffed, so the
// run fires when an admin activates a role.
export default snapshotTrigger<Record<string, unknown>>({
  key: "new-directory-role",
  title: "New Directory Role",
  description: "The run gets each directory role that is newly activated in the tenant.",
  action: listDirectoryRoles as never,
  input: () => ({}),
  output: [
    { key: "id", type: "string", label: "Role object ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "description", type: "string", label: "Description" },
    { key: "roleTemplateId", type: "string", label: "Role template ID" },
  ],
  sample: {
    id: "b0f54661-2d74-4c50-afa3-1ec803f12efe",
    displayName: "User Administrator",
    description: "Can manage all aspects of users and groups.",
    roleTemplateId: "fe930be7-5e62-47db-91af-98c3a49a38b1",
  },
});
