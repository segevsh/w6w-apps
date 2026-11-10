import { signrequestSnapshot } from "../lib/triggers.ts";
import teamMemberList from "../actions/team-member-list.ts";

/**
 * Shape (c) over `team-member-list` (`GET /team-members/`): a team's team members are a small bounded collection, so each check reads
 * all of it and emits the ids not seen before (https://signrequest.com/api/v1/docs/).
 */
export default signrequestSnapshot({
  key: "new-team-member",
  title: "New Team Member",
  description: "The run gets each newly added team member.",
  action: teamMemberList as never,
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: [
    { key: "uuid", type: "string", label: "Team member ID" },
    { key: "is_admin", type: "boolean", label: "Is admin" },
    { key: "is_active", type: "boolean", label: "Is active" },
    { key: "user", type: "object", label: "User" },
  ],
  sample: {
    uuid: "00000000-0000-4000-8000-000000000003",
    is_admin: false,
    is_active: true,
    user: { email: "ada@example.com" },
  },
});
