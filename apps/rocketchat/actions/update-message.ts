import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, RocketChatClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  messageId: string;
  text: string;
  customFields?: unknown;
}

const updateMessage: ActionDefinition<Input> = {
  key: "update-message",
  type: "perform",
  resource: "message",
  title: "Update Message",
  description: "Edit the text of an existing message (`POST /chat.update`).",
  idempotent: true,
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
    { key: "messageId", label: "Message ID", type: "string", required: true },
    { key: "text", label: "New text", type: "text", required: true },
    { key: "customFields", label: "Custom fields", type: "json" },
  ],
  output: [{ key: "message", type: "object", label: "The updated message" }],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/chat.update", {
      method: "POST",
      body: compact({
        roomId: input.roomId,
        msgId: input.messageId,
        text: input.text,
        customFields: jsonValue(input.customFields, "customFields"),
      }),
    });
  },
};

export default updateMessage;
