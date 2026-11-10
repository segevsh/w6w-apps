import type { ActionDefinition } from "@w6w/types";
import teamMemberList from "../actions/team-member-list.ts";
import { listPages, snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/teams/{id}/members` for the team the user picks: one team's roster is a small bounded
// collection (brief 9.1c).
export default snapshotTrigger<{ teamId: string }>({
  key: "new-team-member",
  title: "New Team Member",
  description: "The run gets each member newly added to one team.",
  params: [
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      required: true,
      hint: "UUID from a List teams result.",
    },
  ],
  load: listPages<{ teamId: string }>(
    teamMemberList as unknown as ActionDefinition,
    (p) => ({ teamId: p.teamId }),
  ),
  rowKey: (m) => String(m.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Member ID" },
    { key: "fields", type: "object", label: "Fields (name, email, role)" },
  ],
  sample: {
    id: "member-1",
    type: "member",
    fields: { name: "Jane Doe", email: "jane@example.com", role: "maker" },
  },
});
