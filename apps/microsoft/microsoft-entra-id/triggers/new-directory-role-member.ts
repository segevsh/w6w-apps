import listDirectoryRoleMembers from "../actions/list-directory-role-members.ts";
import { MEMBER_OUTPUT, snapshotTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/api/directoryrole-list-members (verified 2026-11-10): the
// reference supports only `$select` and returns up to 1,000 objects with no `$top`, `$orderby` or
// created-after filter; read whole (nextLink followed) and diffed.
export default snapshotTrigger<{ roleId: string }>({
  key: "new-directory-role-member",
  title: "New Directory Role Member",
  description: "The run gets each user or service principal newly assigned the directory role.",
  action: listDirectoryRoleMembers as never,
  params: [{
    key: "roleId",
    label: "Role",
    type: "string",
    required: true,
    hint: "The directory role's object id (from List Directory Roles).",
  }],
  input: (p) => ({ roleId: p.roleId, idType: "id" }),
  output: MEMBER_OUTPUT,
  sample: {
    "@odata.type": "#microsoft.graph.user",
    id: "87d349ed-44d7-43e1-9a83-5f2406dee5bd",
    displayName: "Adele Vance",
    userPrincipalName: "adele@contoso.example",
    mail: "adele@contoso.example",
  },
});
