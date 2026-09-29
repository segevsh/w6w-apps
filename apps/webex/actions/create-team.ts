import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
}

const createTeam: ActionDefinition<Input> = {
  key: "create-team",
  type: "perform",
  resource: "team",
  title: "Create Team",
  description: "Create a team. The creator's room (space) list becomes the team's default space.",
  // Webex mints a new team id per call and takes no request key.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request("/teams", {
      method: "POST",
      body: { name: input.name, description: unset(input.description) },
    });
  },
};

export default createTeam;
