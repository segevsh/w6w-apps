import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  postOutput,
  type PostResult,
  postResult,
  seg,
  toList,
  ZohoCliqClient,
} from "../lib/client.ts";
import { replyTo, syncMessage, textParam } from "../lib/params.ts";

interface Input {
  botUniqueName: string;
  text: string;
  userIds?: string | string[];
  replyTo?: string;
  syncMessage?: boolean;
}

/**
 * `POST /api/v2/bots/{BOT_UNIQUE_NAME}/message` — scope
 * `ZohoCliq.Webhooks.CREATE`. Body `{ text, userids, reply_to, sync_message }`;
 * `userids` is a COMMA-SEPARATED STRING of user ids or emails (not an array).
 * The reference's `broadcast` flag is marked Deprecated and is not exposed —
 * list the subscribers explicitly with `userids` instead. With
 * `sync_message=true` the response is `{ user_ids, message_details }`.
 */
const messagePostBot: ActionDefinition<Input, PostResult> = {
  key: "message-post-bot",
  type: "perform",
  resource: "message",
  title: "Post Message via Bot",
  description: "Send a message to a bot's subscribers (or to chosen subscribers) as that bot.",
  idempotent: false,
  params: [
    {
      key: "botUniqueName",
      label: "Bot unique name",
      type: "string",
      required: true,
      hint: "Bots & Tools -> Bots -> the bot's API endpoint URL.",
    },
    textParam,
    {
      key: "userIds",
      label: "Subscriber user IDs or emails",
      type: "string",
      hint: "Comma-separated. Leave empty to message the bot conversation itself.",
    },
    replyTo,
    syncMessage,
  ],
  output: [...postOutput],

  async execute(input, ctx) {
    const userIds = toList(input.userIds);
    const body = await new ZohoCliqClient(ctx).request(
      `/bots/${seg(input.botUniqueName)}/message`,
      {
        method: "POST",
        body: compact({
          text: input.text,
          userids: userIds.length ? userIds.join(",") : undefined,
          reply_to: input.replyTo,
          sync_message: input.syncMessage,
        }),
      },
    );
    return postResult(body);
  },
};

export default messagePostBot;
