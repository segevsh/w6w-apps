import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  sessionKey: string;
  messageUuid: string;
}

const messageGet: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get WhatsApp Message",
  description:
    "Get one message and its delivery state (GET /whatsapp/message/{session-key}/{message-uuid}): " +
    "sent, received, read, wa_msg_ack 0-3.",
  params: [
    {
      key: "sessionKey",
      label: "Session key",
      type: "string",
      required: true,
      hint: "e.g. WW-WPN66037eca-…-5215511112222@c.us. From a message or conversation record.",
    },
    {
      key: "messageUuid",
      label: "Message UUID",
      type: "string",
      required: true,
      hint: "Starts with MSG. Returned by Send WhatsApp Message.",
    },
  ],
  output: [
    { key: "message", type: "object", label: "The message with its delivery fields" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(`/whatsapp/message/${seg(input.sessionKey)}/${seg(input.messageUuid)}`);
  },
};

export default messageGet;
