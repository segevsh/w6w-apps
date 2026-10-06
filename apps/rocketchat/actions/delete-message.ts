import type { ActionDefinition } from "@w6w/types";
import { compact, RocketChatClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  messageId: string;
  asUser?: boolean;
}

const deleteMessage: ActionDefinition<Input> = {
  key: "delete-message",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Delete a message by room and message ID (`POST /chat.delete`).",
  // A repeat call after success answers an error (the message is gone).
  idempotent: false,
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "asUser",
      label: "Delete as author",
      type: "boolean",
      hint: "Delete as the user who sent the message (needs the matching permission). " +
        "Default false.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Deleted message ID" },
    { key: "ts", type: "string", label: "Deletion timestamp" },
  ],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/chat.delete", {
      method: "POST",
      body: compact({ roomId: input.roomId, msgId: input.messageId, asUser: input.asUser }),
    });
  },
};

export default deleteMessage;
