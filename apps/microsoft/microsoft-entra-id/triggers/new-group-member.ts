import listGroupMembers from "../actions/list-group-members.ts";
import { MEMBER_OUTPUT, SNAPSHOT_TOP, snapshotTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/api/group-list-members (verified 2026-11-10): the members
// edge documents `$top` (max 999) but no `$orderby` or created-after filter, so the whole
// membership is read each check and diffed.
export default snapshotTrigger<{ groupId: string }>({
  key: "new-group-member",
  title: "New Group Member",
  description: "The run gets each directory object newly added as a direct member of the group.",
  action: listGroupMembers as never,
  params: [{
    key: "groupId",
    label: "Group",
    type: "string",
    required: true,
    hint: "The group's object id (from List Groups).",
  }],
  input: (p) => ({ groupId: p.groupId, top: SNAPSHOT_TOP }),
  output: MEMBER_OUTPUT,
  sample: {
    "@odata.type": "#microsoft.graph.user",
    id: "87d349ed-44d7-43e1-9a83-5f2406dee5bd",
    displayName: "Adele Vance",
    userPrincipalName: "adele@contoso.example",
    mail: "adele@contoso.example",
  },
});
