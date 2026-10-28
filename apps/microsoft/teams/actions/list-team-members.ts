import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, seg } from "../lib/client.ts";
import { filterParam, pagedOutput, pagingParams, selectParam, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  filter?: string;
  select?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /teams/{team-id}/members`
 *
 * https://learn.microsoft.com/en-us/graph/api/team-list-members?view=graph-rest-1.0
 *
 * The team's `conversationMember` collection. Least-privileged delegated scope
 * is `TeamMember.Read.All`; this App requests the higher `TeamMember.ReadWrite.All`
 * because `Add Team Member` needs it.
 *
 * Supports `$filter`, `$select` and `$top`; page size defaults to 100 and caps
 * at 999 — far larger than the 50 the message collections allow.
 *
 * Two things the reference is emphatic about, repeated in the hints because
 * getting them wrong is silent:
 *
 *  - **Membership ids are opaque.** Do not parse the `id`; it is a base64 blob,
 *    not a composite you can take apart. `userId` is the Entra object id.
 *  - **Filtering by user needs the derived-type prefix** —
 *    `microsoft.graph.aadUserConversationMember/userId eq '…'`, not `userId eq '…'`.
 */
const listTeamMembers: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-team-members",
  type: "search",
  resource: "team-member",
  title: "List Team Members",
  description: "List the members of a team, with their roles.",
  params: [
    teamIdParam,
    filterParam(
      "OData `$filter`. Member properties live on a derived type, so they need the full prefix: `microsoft.graph.aadUserConversationMember/userId eq '73761f06-…'`, or `.../email eq 'a@b.com'`.",
    ),
    selectParam(),
    ...pagingParams({ defaultTop: 100, maxTop: 999 }),
  ],
  output: pagedOutput("Members"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = `/teams/${seg(input.teamId)}/members`;
    const options = {
      query: {
        $filter: input.filter,
        $select: odataList(input.select),
        $top: input.top,
      },
    };

    // A nextLink already encodes every query parameter from the original call,
    // so it is replayed verbatim rather than re-decorated.
    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listTeamMembers;
