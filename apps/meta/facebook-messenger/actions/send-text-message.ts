import type { ActionDefinition } from "@w6w/types";
import { MessengerClient } from "../lib/client.ts";
import {
  recipientParam,
  type SendInput,
  sendMessage,
  sendOptionParams,
  sendOutput,
  type SendResponse,
} from "../lib/send.ts";

interface Input extends SendInput {
  text: string;
}

/**
 * Send a text message — `POST /{page}/messages` with `message.text`.
 *
 * Not `idempotent`: a retried call delivers a second copy of the message.
 */
const sendTextMessage: ActionDefinition<Input, SendResponse> = {
  key: "send-text-message",
  type: "perform",
  resource: "message",
  title: "Send Text Message",
  description: "Send a text message to a person who has messaged the Page.",
  idempotent: false,
  params: [
    recipientParam,
    { key: "text", label: "Text", type: "text", required: true },
    ...sendOptionParams,
  ],
  output: sendOutput,

  execute(input, ctx) {
    return sendMessage(new MessengerClient(ctx), input, { text: input.text });
  },
};

export default sendTextMessage;
