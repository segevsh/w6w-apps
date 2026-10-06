import type { ActionDefinition } from "@w6w/types";
import { compact, RecallClient, seg } from "../lib/client.ts";
import { BOT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
  message: string;
  to?: string;
  pin?: boolean;
}

/** `POST /api/v1/bot/{id}/send_chat_message/` — `message` is 1-4096 characters. */
const botSendChatMessage: ActionDefinition<Input> = {
  key: "bot-send-chat-message",
  type: "perform",
  resource: "bot",
  title: "Send Chat Message",
  description: "Make the bot post a message in the meeting chat. The bot must be in the call.",
  idempotent: false,
  params: [
    idParam("Bot ID"),
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      validation: { minLength: 1, maxLength: 4096 },
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint:
        'Defaults to "everyone". Outside Zoom, "everyone" is the only supported value; on Zoom it can be a participant.',
    },
    { key: "pin", label: "Pin the message", type: "boolean" },
  ],
  output: BOT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request(
      "POST",
      `/api/v1/bot/${seg(input.id)}/send_chat_message/`,
      {
        body: compact({ message: input.message, to: input.to, pin: input.pin }),
        idempotent: true,
      },
    );
  },
};

export default botSendChatMessage;
