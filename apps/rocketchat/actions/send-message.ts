import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, RocketChatClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  text?: string;
  threadMessageId?: string;
  alsoSendToChannel?: boolean;
  alias?: string;
  attachments?: unknown;
  blocks?: unknown;
  customFields?: unknown;
}

// `POST /api/v1/chat.sendMessage` — the lower-level sibling of postMessage. Takes a
// `{ message: { rid, msg, ... } }` envelope and ONLY a room id (no `#name` / `@user` shorthand).
const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description:
    "Send a message into a room by room ID, as the connected user. Unlike Post Message it takes " +
    "no `#channel` / `@user` shorthand, but supports UI blocks and sending a thread reply to the " +
    "channel as well.",
  idempotent: false,
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
    { key: "text", label: "Text", type: "text" },
    {
      key: "threadMessageId",
      label: "Thread message ID",
      type: "string",
      hint: "The message ID to create or continue a thread on (`tmid`).",
    },
    {
      key: "alsoSendToChannel",
      label: "Also send to channel",
      type: "boolean",
      hint: "For thread replies: also show the reply in the channel (`tshow`).",
    },
    { key: "alias", label: "Alias", type: "string" },
    { key: "attachments", label: "Attachments", type: "json" },
    { key: "blocks", label: "UI blocks", type: "json", hint: "Array of message blocks." },
    { key: "customFields", label: "Custom fields", type: "json" },
  ],
  output: [
    { key: "message", type: "object", label: "The sent message" },
    { key: "message._id", type: "string", label: "Message ID" },
  ],

  execute(input, ctx) {
    if (!input.text && !input.attachments && !input.blocks) {
      throw new Error("Provide text, attachments or blocks");
    }
    return new RocketChatClient(ctx).request("/chat.sendMessage", {
      method: "POST",
      body: {
        message: compact({
          rid: input.roomId,
          msg: input.text,
          tmid: input.threadMessageId,
          tshow: input.alsoSendToChannel,
          alias: input.alias,
          attachments: jsonValue(input.attachments, "attachments"),
          blocks: jsonValue(input.blocks, "blocks"),
          customFields: jsonValue(input.customFields, "customFields"),
        }),
      },
    });
  },
};

export default sendMessage;
