import { snapshotTrigger } from "../lib/triggers.ts";
import listInvitations from "../actions/list-invitations.ts";

/**
 * `GET /v0/invitations` returns every invitation link in one unpaged response
 * (https://heartbeat.readme.io/reference/getinvitations), one community's own invitation links (bounded; the kit caps a snapshot at 5000 rows), so each check diffs
 * the ids against the previous one (`pollSnapshot`, added only).
 */
export default snapshotTrigger({
  key: "new-invitation",
  title: "New Invitation Link",
  description: "The run gets each newly created invitation link of the Heartbeat community.",
  action: listInvitations,
  field: "invitations",
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "code", type: "string", label: "Invitation code" },
    { key: "role", type: "object", label: "Role the invitee gets" },
    { key: "role.id", type: "string", label: "Role ID" },
    { key: "role.name", type: "string", label: "Role name" },
    {
      key: "groups",
      type: "array",
      label: "Groups the invitee joins",
      items: [
        { key: "id", type: "string", label: "Group ID" },
        { key: "name", type: "string", label: "Group name" },
      ],
    },
  ],
  sample: {
    id: "5dbcf5c9-5e7e-4285-9dab-6d3ce7f4dd1e",
    code: "welcome",
    role: { id: "1f0c8a3e-6b1d-4a52-9e0b-7d3a5c2e4f81", name: "Member" },
    groups: [{ id: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601", name: "Founders" }],
  },
});
