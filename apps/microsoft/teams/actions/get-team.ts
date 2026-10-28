import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, seg } from "../lib/client.ts";
import { selectParam, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /teams/{team-id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/team-get?view=graph-rest-1.0
 *
 * The full team resource — settings, visibility, `webUrl`, `summary` — as
 * opposed to the five populated fields `List Teams` hands back. Requires
 * `Team.ReadBasic.All`.
 *
 * Supports `$select` and `$expand`.
 */
const getTeam: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-team",
  type: "read",
  resource: "team",
  title: "Get Team",
  description: "Get the full properties of one team, including its settings.",
  params: [
    teamIdParam,
    selectParam(
      "OData `$select`, e.g. `id`, `displayName`, `visibility`, `summary`. List Teams populates only five properties; this call populates all of them.",
    ),
    {
      key: "expand",
      label: "Expand",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OData `$expand`, e.g. `members` or `channels`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Team id" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "webUrl", type: "string", label: "Web URL" },
    { key: "isArchived", type: "boolean", label: "Archived" },
  ],

  execute(input, ctx): Promise<Record<string, unknown>> {
    const client = new GraphClient(ctx);
    return client.request(`/teams/${seg(input.teamId)}`, {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
      },
    });
  },
};

export default getTeam;
