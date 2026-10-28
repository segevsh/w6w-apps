import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, seg } from "../lib/client.ts";
import {
  continuationParams,
  filterParam,
  pagedOutput,
  selectParam,
  teamIdParam,
} from "../lib/params.ts";

interface Input {
  teamId: string;
  filter?: string;
  select?: string[];
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /teams/{team-id}/channels`
 *
 * https://learn.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-1.0
 *
 * The channels in a team. Requires `Channel.ReadBasic.All`.
 *
 * The reference documents **`$filter` and `$select` only** — no `$top` — so this
 * action offers the continuation controls without a page-size field rather than
 * inventing one. `@odata.nextLink` is documented on the response.
 *
 * Three documented behaviours the hints carry:
 *
 *  - **Private and shared channels you are not in are invisible**, which makes
 *    an empty-looking team a permissions answer rather than a bug.
 *  - **`$select` is a performance lever, not just a filter.** Populating `email`
 *    is called out as an expensive operation; excluding it speeds the call up.
 *  - **`layoutType` comes back `null` from this endpoint** — a known issue
 *    Microsoft records; `Get Channel` returns the real value.
 */
const listChannels: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-channels",
  type: "search",
  resource: "channel",
  title: "List Channels",
  description: "List the channels in a team, optionally filtered by membership type.",
  params: [
    teamIdParam,
    filterParam(
      "OData `$filter`, e.g. `membershipType eq 'private'` or `membershipType eq 'shared'`. Private and shared channels the signed-in user is not a member of never appear, filter or not.",
    ),
    selectParam(
      "OData `$select`. Populating `email` is documented as an expensive operation — excluding it makes this call noticeably faster.",
    ),
    ...continuationParams(),
  ],
  output: pagedOutput("Channels"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = `/teams/${seg(input.teamId)}/channels`;
    const options = {
      query: {
        $filter: input.filter,
        $select: odataList(input.select),
      },
    };

    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listChannels;
