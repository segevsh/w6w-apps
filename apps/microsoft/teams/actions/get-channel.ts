import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, seg } from "../lib/client.ts";
import { channelIdParam, selectParam, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  channelId: string;
  select?: string[];
}

/**
 * `GET /teams/{team-id}/channels/{channel-id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/channel-get?view=graph-rest-1.0
 *
 * One channel. Requires `Channel.ReadBasic.All`.
 *
 * `$select` does double duty here, and both directions matter:
 *
 *  - **Ask for less to go faster.** `email` and `summary` are documented as
 *    expensive to populate.
 *  - **Ask for `summary` explicitly or you will not get it.** The reference is
 *    explicit that `summary` (owner/member/guest counts) is *only* returned when
 *    named in `$select` — it is absent from the default projection.
 *
 * This is also the endpoint that returns a real `layoutType`; `List Channels`
 * returns `null` for it, which Microsoft records as a known issue.
 */
const getChannel: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-channel",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Get one channel's properties, optionally including its membership summary.",
  params: [
    teamIdParam,
    channelIdParam,
    selectParam(
      "OData `$select`. Pass `summary` to get the owner/member/guest counts — they are omitted from the default response and can only be retrieved this way. Excluding `email` and `summary` makes the call faster.",
    ),
  ],
  output: [
    { key: "id", type: "string", label: "Channel id" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "membershipType", type: "string", label: "Membership type" },
    { key: "layoutType", type: "string", label: "Layout type" },
    { key: "webUrl", type: "string", label: "Web URL" },
    { key: "isArchived", type: "boolean", label: "Archived" },
  ],

  execute(input, ctx): Promise<Record<string, unknown>> {
    const client = new GraphClient(ctx);
    return client.request(
      `/teams/${seg(input.teamId)}/channels/${seg(input.channelId)}`,
      { query: { $select: odataList(input.select) } },
    );
  },
};

export default getChannel;
