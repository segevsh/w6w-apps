import type { TriggerDefinition } from "@w6w/types";
import listTeamMembers from "../actions/list-team-members.ts";
import { snapshotAdded, TEAMS_MIN_INTERVAL_MS } from "../lib/triggers.ts";

interface Params {
  teamId: string;
}

/** Members per request; 10 requests of 500 stay inside the snapshot kit's 5,000-row cap. */
const PAGE_SIZE = 500;

/**
 * `GET /teams/{team-id}/members?$top=500` — the same request as List Team Members. Graph's default
 * and maximum page sizes are 100 and 999 (https://learn.microsoft.com/en-us/graph/api/team-list-members,
 * verified 2026-11-10). A membership has no join time to sort or filter by, so the whole list is
 * compared with the last check; a team past 5,000 members fails the check with a clear error.
 */
const newTeamMember: TriggerDefinition<Params> = {
  key: "new-team-member",
  title: "New Team Member",
  description:
    "Fires when someone is added to a team. The run gets the membership's id, the person's user id, name, email and roles.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true, hint: "From List Teams." },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "userId", type: "string", label: "User ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "roles", type: "array", label: "Roles" },
  ],
  sample: {
    id: "MmY0YjAyMjMtMzg1Mi00ZGZiLTgyOGYtOGIyZmFhYjMwMjViIyM4OTJmM2M4Yw==",
    userId: "892f3c8c-8b7c-4b7a-9b23-0fd1f5f8a111",
    displayName: "Alex Example",
    email: "alex@example.com",
    roles: ["member"],
  },
  minIntervalMs: TEAMS_MIN_INTERVAL_MS,
  poll({ params, state }, ctx) {
    return snapshotAdded(
      listTeamMembers,
      { teamId: params.teamId, top: PAGE_SIZE },
      state,
      ctx,
      "team members",
    );
  },
};

export default newTeamMember;
