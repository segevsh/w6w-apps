import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, resultsOf } from "../lib/client.ts";

interface Input {
  expandMembers?: boolean;
  limit?: number;
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
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Teams per page (Mixmax default 100, at most 500).",
    },
  ],
  output: [{ key: "results", type: "array", label: "Teams" }],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/teams", {
      query: { expand: input.expandMembers ? "members" : undefined, limit: input.limit },
    });
    return { results: resultsOf(r) };
  },
};

export default teamList;
