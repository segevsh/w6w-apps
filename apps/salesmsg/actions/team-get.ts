import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /teams/{team}` — "Get team" (scope `teams:read`).
 */
interface Input {
  team: number;
}

const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Inbox",
  description: "Get one team (inbox) by ID.",
  params: [
    {
      key: "team",
      label: "Team ID",
      type: "number",
      required: true,
      hint: "The team (inbox) ID, from List Inboxes.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "response", type: "object", label: "Team" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(`/teams/${encodePathSegment(input.team)}`);
  },
};

export default teamGet;
