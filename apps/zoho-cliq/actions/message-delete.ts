import type { ActionDefinition } from "@w6w/types";
import { seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { chatId, messageId } from "../lib/params.ts";

interface Input {
  chatId: string;
  messageId: string;
}

/**
 * `DELETE /api/v2/chats/{CHAT_ID}/messages/{MESSAGE_ID}` — scope
 * `ZohoCliq.Messages.DELETE`; `204`.
 */
const messageDelete: ActionDefinition<Input, Success> = {
  key: "message-delete",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Delete a message from a chat or channel.",
  idempotent: true,
  params: [chatId, messageId],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new ZohoCliqClient(ctx).request(
      `/chats/${seg(input.chatId)}/messages/${seg(input.messageId)}`,
      { method: "DELETE" },
    );
    return SUCCESS;
  },
};

export default messageDelete;
