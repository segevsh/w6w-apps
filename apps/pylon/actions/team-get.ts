import type { ActionDefinition } from "@w6w/types";
import { PylonClient, seg } from "../lib/client.ts";
import { idParam, TEAM_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /teams/{id}`. */
const teamGet: ActionDefinition<Input> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Fetch one team by ID, with its members, assignment method and schedule.",
  params: [idParam("Team ID")],
  output: TEAM_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("GET", `/teams/${seg(input.id)}`);
  },
};

export default teamGet;
