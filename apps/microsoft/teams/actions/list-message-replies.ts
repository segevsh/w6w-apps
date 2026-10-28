import type { ActionDefinition } from "@w6w/types";
import { GraphClient, type PagedResult, seg } from "../lib/client.ts";
import { channelIdParam, pagedOutput, pagingParams, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  channelId: string;
  messageId: string;
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /teams/{team-id}/channels/{channel-id}/messages/{message-id}/replies`
 *
 * https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies?view=graph-rest-1.0
 *
 * Every reply to one channel message. Requires `ChannelMessage.Read.All`
 * (**admin consent**).
 *
 * "This method lists only the replies of the specified message" — the root
 * itself is not in the result. Pair it with `Get Channel Message` when you need
 * the whole thread.
 *
 * `$top` is the only supported OData parameter and caps at **50**; the reference
 * says the others "aren't currently supported". A long thread therefore needs
 * the `Fetch all pages` walk rather than one big request.
 */
const listMessageReplies: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-message-replies",
  type: "search",
  resource: "channel-message",
  title: "List Message Replies",
  description: "List the replies to one channel message. The root message is not included.",
  params: [
    teamIdParam,
    channelIdParam,
    {
      key: "messageId",
      label: "Message",
      type: "string",
      required: true,
      placeholder: "1616989510408",
      hint: "The root message's id.",
    },
    ...pagingParams({ defaultTop: 20, maxTop: 50 }),
  ],
  output: pagedOutput("Replies"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const path = `/teams/${seg(input.teamId)}/channels/${seg(input.channelId)}/messages/${
      seg(input.messageId)
    }/replies`;
    const options = { query: { $top: input.top } };

    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listMessageReplies;
