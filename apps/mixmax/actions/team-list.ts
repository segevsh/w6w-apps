import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, resultsOf } from "../lib/client.ts";

interface Input {
  expandMembers?: boolean;
}

const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List the teams you are on, optionally with their members.",
  params: [
    {
      key: "expandMembers",
      label: "Expand members",
      type: "boolean",
      hint: "Include the members of each team.",
    },
  ],
  output: [{ key: "results", type: "array", label: "Teams" }],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/teams", {
      query: { expand: input.expandMembers ? "members" : undefined },
    });
    return { results: resultsOf(r) };
  },
};

export default teamList;
