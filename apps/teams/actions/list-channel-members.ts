import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, seg } from "../lib/client.ts";
import {
  channelIdParam,
  filterParam,
  pagedOutput,
  pagingParams,
  selectParam,
  teamIdParam,
} from "../lib/params.ts";

interface Input {
  teamId: string;
  channelId: string;
  filter?: string;
  select?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /teams/{team-id}/channels/{channel-id}/members`
 *
 * https://learn.microsoft.com/en-us/graph/api/channel-list-members?view=graph-rest-1.0
 *
 * The channel's **direct** members. Requires `ChannelMember.Read.All`, which is
 * one of this App's two **admin-consent** scopes — a tenant where no admin has
 * consented gets a 403 here while every other read still works.
 *
 * "Direct" is the load-bearing word. For a `standard` channel the membership is
 * the team's, so this mostly restates `List Team Members`; for a `private` or
 * `shared` channel it is the channel's own list, which is the case worth having.
 * For a shared channel it returns direct members only — the *indirect* members
 * that reach it through another team live behind `.../allMembers`, which is not
 * implemented here.
 *
 * Supports `$filter`, `$select` and `$top` (default 100, max 999), with the same
 * derived-type prefix rule as team members.
 */
const listChannelMembers: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-channel-members",
  type: "search",
  resource: "channel-member",
  title: "List Channel Members",
  description: "List the direct members of a channel, with their roles.",
  params: [
    teamIdParam,
    channelIdParam,
    filterParam(
      "OData `$filter`. Member properties live on a derived type, so they need the full prefix: `microsoft.graph.aadUserConversationMember/userId eq '73761f06-…'`.",
    ),
    selectParam(),
    ...pagingParams({ defaultTop: 100, maxTop: 999 }),
  ],
  output: pagedOutput("Members"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = `/teams/${seg(input.teamId)}/channels/${seg(input.channelId)}/members`;
    const options = {
      query: {
        $filter: input.filter,
        $select: odataList(input.select),
        $top: input.top,
      },
    };

    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listChannelMembers;
