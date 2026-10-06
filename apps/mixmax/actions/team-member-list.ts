import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, resultsOf, seg } from "../lib/client.ts";

interface Input {
  teamId: string;
}

const teamMemberList: ActionDefinition<Input> = {
  key: "team-member-list",
  type: "read",
  resource: "team",
  title: "List Team Members",
  description: "List the members of a team.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true, hint: "The team `_id`." },
  ],
  output: [{ key: "results", type: "array", label: "Members" }],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", `/teams/${seg(input.teamId)}/members`);
    return { results: resultsOf(r) };
  },
};

export default teamMemberList;
