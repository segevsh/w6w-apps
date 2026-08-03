import type { ActionDefinition } from "@w6w/types";
import { GraphClient, seg } from "../lib/client.ts";
import { channelIdParam, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  channelId: string;
  messageId: string;
  replyId?: string;
}

/**
 * `GET /teams/{team-id}/channels/{channel-id}/messages/{message-id}`
 * `GET /teams/{team-id}/channels/{channel-id}/messages/{message-id}/replies/{reply-id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/chatmessage-get?view=graph-rest-1.0
 *
 * One channel message, or one reply to it. Requires `ChannelMessage.Read.All`
 * (**admin consent**).
 *
 * Both paths are the same operation in Graph's reference, so they are one action
 * here rather than two: supplying a Reply id switches to the nested form. The
 * reason the nested form exists at all is that message ids are only unique
 * *within* a chat, channel, or reply-to-message — the reference says so
 * explicitly — so a reply cannot be fetched from the channel's root collection.
 *
 * No OData is supported on this endpoint: "This method doesn't support the OData
 * query parameters to customize the response." Hence no `$select`.
 */
const getChannelMessage: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-channel-message",
  type: "read",
  resource: "channel-message",
  title: "Get Channel Message",
  description: "Get a single channel message, or a single reply to one.",
  params: [
    teamIdParam,
    channelIdParam,
    {
      key: "messageId",
      label: "Message",
      type: "string",
      required: true,
      placeholder: "1616990032035",
      hint: "The root message's id.",
    },
    {
      key: "replyId",
      label: "Reply",
      type: "string",
      advanced: true,
      hint:
        "Optional. Set it to fetch a reply instead of the root message. Message ids are unique only within their own thread, so a reply cannot be fetched from the channel's root collection.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message id" },
    { key: "replyToId", type: "string", label: "Parent message id" },
    { key: "messageType", type: "string", label: "Message type" },
    { key: "body", type: "object", label: "Body" },
    { key: "from", type: "object", label: "Sender" },
    { key: "webUrl", type: "string", label: "Permalink" },
    { key: "createdDateTime", type: "string", label: "Created at" },
  ],

  execute(input, ctx): Promise<Record<string, unknown>> {
    const client = new GraphClient(ctx);
    const base = `/teams/${seg(input.teamId)}/channels/${seg(input.channelId)}/messages/${
      seg(input.messageId)
    }`;
    const path = input.replyId ? `${base}/replies/${seg(input.replyId)}` : base;
    return client.request(path);
  },
};

export default getChannelMessage;
