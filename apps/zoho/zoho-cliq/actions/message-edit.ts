import type { ActionDefinition } from "@w6w/types";
import { compact, seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { chatId, messageId, textParam } from "../lib/params.ts";

interface Input {
  chatId: string;
  messageId: string;
  text: string;
  notifyEdit?: boolean;
}

/**
 * `PUT /api/v2/chats/{CHAT_ID}/messages/{MESSAGE_ID}` — scope
 * `ZohoCliq.Messages.UPDATE`; body `{ text, notify_edit }`; `204`.
 */
const messageEdit: ActionDefinition<Input, Success> = {
  key: "message-edit",
  type: "perform",
  resource: "message",
  title: "Edit Message",
  description: "Edit the text of a message in a chat or channel.",
  idempotent: true,
  params: [
    chatId,
    messageId,
    { ...textParam, label: "New text" },
    {
      key: "notifyEdit",
      label: "Notify participants",
      type: "boolean",
      hint: "Tell the participants the message was edited.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Edited" }],

  async execute(input, ctx) {
    await new ZohoCliqClient(ctx).request(
      `/chats/${seg(input.chatId)}/messages/${seg(input.messageId)}`,
      { method: "PUT", body: compact({ text: input.text, notify_edit: input.notifyEdit }) },
    );
    return SUCCESS;
  },
};

export default messageEdit;
