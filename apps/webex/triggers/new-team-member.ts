import { snapshotTrigger } from "../lib/polls.ts";
import listTeamMemberships from "../actions/list-team-memberships.ts";

/**
 * `GET /team/memberships?teamId=<id>&max=100` (the `list-team-memberships` action): everyone in one
 * team the user picks. Webex has no team-membership webhook and states no ceiling for `max`, so a
 * full default page of 100 is treated as possibly cut short and throws (see `lib/polls.ts`).
 */
const newTeamMember = snapshotTrigger<{ teamId: string; max: number }, { teamId: string }>({
  key: "new-team-member",
  title: "New Team Member",
  description:
    "The run gets each person newly added to a Webex team you pick (checked every 5 minutes; fails for a team of 100 or more members).",
  action: listTeamMemberships,
  input: (p) => ({ teamId: String(p.teamId ?? "").trim(), max: 100 }),
  cap: 100,
  params: [{
    key: "teamId",
    label: "Team ID",
    type: "string",
    required: true,
    hint: "The team to watch (from List Teams).",
  }],
  output: [
    { key: "id", type: "string", label: "Team membership ID" },
    { key: "teamId", type: "string", label: "Team ID" },
    { key: "personId", type: "string", label: "Person ID" },
    { key: "personEmail", type: "string", label: "Person email" },
    { key: "personDisplayName", type: "string", label: "Person display name" },
    { key: "isModerator", type: "boolean", label: "Moderator" },
    { key: "created", type: "string", label: "Created (ISO 8601)" },
  ],
  sample: {
    id: "Y2lzY29zcGFyazovL3VzL1RFQU1fTUVNQkVSU0hJUC8wZjg1",
    teamId: "Y2lzY29zcGFyazovL3VzL1RFQU0vMTNlMThmNDAtNDJmYy0xMWU2LWE5ZDgtMjExYTBkYzc5NzY5",
    personId: "Y2lzY29zcGFyazovL3VzL1BFT1BMRS83MTZlOWQxYy1hMjM1LTQ4MTUtOTExNS1hMzRmYzE4YjVlOTI",
    personEmail: "matt@example.com",
    personDisplayName: "Matt Example",
    isModerator: false,
    created: "2026-11-10T11:00:00.000Z",
  },
});

export default newTeamMember;
