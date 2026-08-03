import type { ActionDefinition } from "@w6w/types";
import { GraphClient, type PagedResult, seg } from "../lib/client.ts";
import { channelIdParam, pagedOutput, pagingParams, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  channelId: string;
  expandReplies?: boolean;
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /teams/{team-id}/channels/{channel-id}/messages`
 *
 * https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0
 *
 * The **root** messages in a channel — replies are excluded unless you ask for
 * them. Requires `ChannelMessage.Read.All`, an **admin-consent** scope: an
 * ordinary user can post to a channel with `ChannelMessage.Send` but cannot read
 * it back without a tenant administrator's approval. That asymmetry is the
 * single most surprising thing about the Teams API and is called out in the
 * README.
 *
 * The query surface is narrow and exactly as documented — `$top` and `$expand`,
 * nothing else. In particular there is no `$filter` and no `$orderby`; ordering
 * is fixed by the service (by the last-modified date of the whole reply chain,
 * so an old thread with a new reply sorts to the top).
 *
 *  - **`$top` caps at 50**, default 20.
 *  - **`$expand=replies`** inlines up to 200 replies per message by default and
 *    up to ~1,000 in practice, with any overflow behind a *separate*
 *    `replies@odata.nextLink` on each message. This action does not walk that
 *    inner cursor — `List Message Replies` is the tool for a deep thread — so
 *    the expansion is offered as a convenience, not as a completeness promise.
 *
 * Beware `messageType`: the collection includes `systemEventMessage` entries
 * ("X added Y to the team") whose `from` is `null` and whose body is the literal
 * `<systemEventMessage/>`. They are messages to Graph, not to a human.
 */
const listChannelMessages: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-channel-messages",
  type: "search",
  resource: "channel-message",
  title: "List Channel Messages",
  description: "List the root messages in a channel, optionally with their replies inlined.",
  params: [
    teamIdParam,
    channelIdParam,
    {
      key: "expandReplies",
      label: "Include replies",
      type: "boolean",
      default: false,
      hint:
        "Sends `$expand=replies`. Inlines up to 200 replies per message by default; a message with more carries its own `replies@odata.nextLink`, which this action does not follow — use List Message Replies for a deep thread.",
    },
    ...pagingParams({ defaultTop: 20, maxTop: 50 }),
  ],
  output: pagedOutput("Messages"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = `/teams/${seg(input.teamId)}/channels/${seg(input.channelId)}/messages`;
    const options = {
      query: {
        $top: input.top,
        $expand: input.expandReplies ? "replies" : undefined,
      },
    };

    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listChannelMessages;
