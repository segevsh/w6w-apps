import type { ActionDefinition } from "@w6w/types";
import { seg, unwrapData, ZohoCliqClient } from "../lib/client.ts";
import { chatId, messageId } from "../lib/params.ts";

interface Input {
  chatId: string;
  messageId: string;
}

interface Output {
  message: Record<string, unknown>;
}

/** `GET /api/v2/chats/{CHAT_ID}/messages/{MESSAGE_ID}` — scope `ZohoCliq.Messages.READ`. */
const messageGet: ActionDefinition<Input, Output> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Get one message from a chat or channel.",
  params: [chatId, messageId],
  output: [{ key: "message", type: "object", label: "Message" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request(
      `/chats/${seg(input.chatId)}/messages/${seg(input.messageId)}`,
    );
    return { message: unwrapData(body) };
  },
};

export default messageGet;
