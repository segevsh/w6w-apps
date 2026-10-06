import type { ActionDefinition } from "@w6w/types";
import { RingoverClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team",
  description:
    "Fetch the team: its name, users, phone numbers, IVRs, conferences, tags and groups (the full object needs Monitoring on the key).",
  params: [],
  output: [
    { key: "team_id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Team name" },
    { key: "users", type: "array", label: "Users" },
    { key: "numbers", type: "array", label: "Phone numbers" },
    { key: "ivrs", type: "array", label: "IVRs" },
    { key: "conferences", type: "array", label: "Conferences" },
    { key: "tags", type: "array", label: "Call tags" },
    { key: "groups", type: "array", label: "Groups" },
  ],

  execute(_input, ctx) {
    return new RingoverClient(ctx).request("GET", "/teams");
  },
};

export default teamGet;
