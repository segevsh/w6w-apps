import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, itemBody, seg } from "../lib/client.ts";
import { channelIdParam, messageBodyParams, teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  channelId: string;
  messageId: string;
  content: string;
  contentType?: string;
  importance?: string;
}

/**
 * `POST /teams/{team-id}/channels/{channel-id}/messages/{message-id}/replies`
 *
 * https://learn.microsoft.com/en-us/graph/api/chatmessage-post-replies?view=graph-rest-1.0
 *
 * Replies to an existing channel message. Answers `201 Created`. Requires
 * `ChannelMessage.Send` — the same non-admin scope as posting a root message.
 *
 * Teams has a **one-level** thread model: a reply's `replyToId` is always the
 * *root* message, never another reply, so there is no reply-to-a-reply and no
 * `Reply` id parameter here. Replying to a reply means replying to its root.
 *
 * No `subject`: a reply does not carry a title in the Teams UI, so offering the
 * field would be offering a no-op.
 *
 * `idempotent: false` — same reasoning as Send Channel Message. No dedupe key
 * exists, so a retry posts a second reply.
 */
const replyToChannelMessage: ActionDefinition<Input, Record<string, unknown>> = {
  key: "reply-to-channel-message",
  type: "perform",
  resource: "channel-message",
  title: "Reply to Channel Message",
  description: "Post a reply to an existing message in a team channel.",
  idempotent: false,
  params: [
    teamIdParam,
    channelIdParam,
    {
      key: "messageId",
      label: "Message",
      type: "string",
      required: true,
      placeholder: "1616990032035",
      hint:
        "The **root** message's id. Teams threads are one level deep — a reply's parent is always the root, so pass the root's id even when you are answering a reply.",
    },
    ...messageBodyParams(),
  ],
  output: [
    { key: "id", type: "string", label: "Reply id" },
    { key: "replyToId", type: "string", label: "Parent message id" },
    { key: "webUrl", type: "string", label: "Permalink" },
    { key: "createdDateTime", type: "string", label: "Created at" },
  ],

  execute(input, ctx): Promise<Record<string, unknown>> {
    const client = new GraphClient(ctx);
    ctx.log("info", "replying to channel message", { messageId: input.messageId });

    return client.request(
      `/teams/${seg(input.teamId)}/channels/${seg(input.channelId)}/messages/${
        seg(input.messageId)
      }/replies`,
      {
        method: "POST",
        body: compact({
          body: itemBody(input.content, input.contentType),
          importance: input.importance,
        }),
      },
    );
  },
};

export default replyToChannelMessage;
