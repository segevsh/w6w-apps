import listGroupOwners from "../actions/list-group-owners.ts";
import { MEMBER_OUTPUT, SNAPSHOT_TOP, snapshotTrigger } from "../lib/triggers.ts";

// https://learn.microsoft.com/en-us/graph/api/group-list-owners (verified 2026-11-10): owners are a
// short list with `$top` (max 999) and no sort or created-after filter; read whole and diffed.
export default snapshotTrigger<{ groupId: string }>({
  key: "new-group-owner",
  title: "New Group Owner",
  description: "The run gets each directory object newly made an owner of the group.",
  action: listGroupOwners as never,
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
