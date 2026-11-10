import type { TriggerDefinition } from "@w6w/types";
import hubList from "../actions/hub-list.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `GET /hubs` returns every hub of the organization in one array
 * (https://docs.onfleet.com/reference/list-hubs, 2026-11-10); a check diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-hub",
  title: "New Hub",
  description: "The run gets each hub that appears in the Onfleet organization.",
  output: [
    { key: "id", type: "string", label: "Hub ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "location", type: "array", label: "Location [lng, lat]" },
    { key: "address", type: "object", label: "Address" },
    { key: "teams", type: "array", label: "Team IDs" },
  ],
  sample: {
    id: "tKxSfU7psqDQEBVn5bbVVfa5",
    name: "Sample Hub",
    location: [-122.4, 37.78],
    address: { city: "San Francisco" },
    teams: [],
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => newRecords({ state, action: hubList, field: "hubs", ctx }),
};

export default trigger;
