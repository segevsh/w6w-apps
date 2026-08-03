import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, seg } from "../lib/client.ts";
import { selectParam, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  select?: string[];
}

/**
 * `GET /teams/{id}/primaryChannel`
 *
 * https://learn.microsoft.com/en-us/graph/api/team-get-primarychannel?view=graph-rest-1.0
 *
 * The team's default **General** channel. Requires `Channel.ReadBasic.All`.
 *
 * This exists so that "post to the team" is a two-call workflow instead of a
 * three-call one: without it you list every channel and pick the one named
 * General, which is both slower and wrong in tenants where General has been
 * renamed. Graph gives it a dedicated navigation property; this action is that
 * property.
 */
const getPrimaryChannel: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-primary-channel",
  type: "read",
  resource: "channel",
  title: "Get Primary Channel",
  description: "Get a team's default (General) channel.",
  params: [teamIdParam, selectParam()],
  output: [
    { key: "id", type: "string", label: "Channel id" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "membershipType", type: "string", label: "Membership type" },
    { key: "webUrl", type: "string", label: "Web URL" },
  ],

  execute(input, ctx): Promise<Record<string, unknown>> {
    const client = new GraphClient(ctx);
    return client.request(`/teams/${seg(input.teamId)}/primaryChannel`, {
      query: { $select: odataList(input.select) },
    });
  },
};

export default getPrimaryChannel;
