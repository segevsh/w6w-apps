import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, seg } from "../lib/client.ts";

interface Input {
  teamId: string;
  expandMembers?: boolean;
}

const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Fetch one team by id, optionally with its members.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true, hint: "The team `_id`." },
    {
      key: "expandMembers",
      label: "Expand members",
      type: "boolean",
      hint: "Include the members of the team.",
    },
  ],
  output: [{ key: "team", type: "object", label: "Team" }],

  async execute(input, ctx) {
    const team = await new MixmaxClient(ctx).request("GET", `/teams/${seg(input.teamId)}`, {
      query: { expand: input.expandMembers ? "members" : undefined },
    });
    return { team };
  },
};

export default teamGet;
