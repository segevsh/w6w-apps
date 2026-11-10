import type { TriggerDefinition } from "@w6w/types";
import listTeams from "../actions/list-teams.ts";
import { snapshotAdded, TEAMS_MIN_INTERVAL_MS } from "../lib/triggers.ts";

/**
 * `GET /me/joinedTeams` — the same request as List Teams. The teams one user has joined are few,
 * so the list is read whole each check and compared with the last one. The endpoint takes no OData
 * parameters (https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams, verified 2026-11-10).
 */
const newTeam: TriggerDefinition<Record<string, never>> = {
  key: "new-team",
  title: "New Team",
  description:
    "Fires when the signed-in user joins (or creates) a new team. The run gets the team's id, name and description.",
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "isArchived", type: "boolean", label: "Archived" },
  ],
  sample: {
    id: "172b0cce-e65d-44ce-9a49-91d9f2e8493a",
    displayName: "Engineering",
    description: "Product engineering",
    isArchived: false,
  },
  minIntervalMs: TEAMS_MIN_INTERVAL_MS,
  poll({ state }, ctx) {
    return snapshotAdded(listTeams, {}, state, ctx, "teams");
  },
};

export default newTeam;
