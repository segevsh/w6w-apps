import type { ActionDefinition } from "@w6w/types";
import { RocketChatClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Fetch one message by ID (`GET /chat.getMessage`).",
  params: [{ key: "messageId", label: "Message ID", type: "string", required: true }],
  output: [{ key: "message", type: "object", label: "The message" }],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/chat.getMessage", {
      query: { msgId: input.messageId },
    });
  },
};

export default getMessage;
