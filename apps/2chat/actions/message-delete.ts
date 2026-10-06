import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  sessionKey: string;
  messageUuid: string;
}

const messageDelete: ActionDefinition<Input> = {
  key: "message-delete",
  type: "perform",
  idempotent: true,
  resource: "message",
  title: "Delete WhatsApp Message",
  description: "Delete a message from 2Chat and from WhatsApp (DELETE " +
    "/whatsapp/message/{session-key}/{message-uuid}). WhatsApp only honours it for 60 hours after " +
    "sending; in a group, only an admin can delete someone else's message and WhatsApp otherwise " +
    "silently ignores it.",
  params: [
    {
      key: "sessionKey",
      label: "Session key",
      type: "string",
      required: true,
    },
    {
      key: "messageUuid",
      label: "Message UUID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "message_uuid", type: "string", label: "Deleted message" },
    { key: "whatsapp_message_id", type: "string", label: "WhatsApp's id for it" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.delete(`/whatsapp/message/${seg(input.sessionKey)}/${seg(input.messageUuid)}`);
  },
};

export default messageDelete;
