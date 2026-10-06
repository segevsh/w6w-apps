import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoCliqClient } from "../lib/client.ts";

interface Input {
  joined?: boolean;
}

interface Output {
  teams: Array<Record<string, unknown>>;
}

/** `GET /api/v2/teams?joined=` — scope `ZohoCliq.Teams.READ`; `{ teams: [...] }`. */
const teamList: ActionDefinition<Input, Output> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "List the teams in the organization.",
  params: [{
    key: "joined",
    label: "Joined only",
    type: "boolean",
    hint: "Only teams the authorizing user is a member of.",
  }],
  output: [{ key: "teams", type: "array", label: "Teams" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<
      { teams?: Array<Record<string, unknown>> }
    >("/teams", { query: compact({ joined: input.joined }) });
    return { teams: body?.teams ?? [] };
  },
};

export default teamList;
