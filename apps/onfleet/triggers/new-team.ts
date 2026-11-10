import type { TriggerDefinition } from "@w6w/types";
import teamList from "../actions/team-list.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `GET /teams` returns every team of the organization in one array
 * (https://docs.onfleet.com/reference/list-teams, 2026-11-10); a check diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-team",
  title: "New Team",
  description: "The run gets each team that appears in the Onfleet organization.",
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workers", type: "array", label: "Worker IDs" },
    { key: "managers", type: "array", label: "Manager IDs" },
    { key: "hub", type: "string", label: "Hub ID" },
  ],
  sample: {
    id: "Cdw7wvEWx5hbuYUbS2P9ZZEs",
    name: "Sample Team",
    workers: [],
    managers: [],
    hub: null,
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => newRecords({ state, action: teamList, field: "teams", ctx }),
};

export default trigger;
