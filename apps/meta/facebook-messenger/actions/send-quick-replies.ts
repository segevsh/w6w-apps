import type { ActionDefinition } from "@w6w/types";
import { jsonParam, MessengerClient } from "../lib/client.ts";
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
  quickReplies: unknown;
}

/**
 * Text with up to 13 quick-reply buttons (`content_type` text, user_phone_number or
 * user_email) shown above the composer.
 */
const sendQuickReplies: ActionDefinition<Input, SendResponse> = {
  key: "send-quick-replies",
  type: "perform",
  resource: "message",
  title: "Send Quick Replies",
  description: "Send a text message with quick-reply buttons.",
  idempotent: false,
  params: [
    recipientParam,
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "quickReplies",
      label: "Quick replies (JSON array)",
      type: "json",
      required: true,
      hint:
        'Up to 13: [{"content_type":"text","title":"Red","payload":"PICKED_RED"},{"content_type":"user_email"}]. Titles are limited to 20 characters, payloads to 1000.',
    },
    ...sendOptionParams,
  ],
  output: sendOutput,

  execute(input, ctx) {
    const quickReplies = jsonParam<unknown[]>("quickReplies", input.quickReplies);
    if (!Array.isArray(quickReplies) || quickReplies.length < 1 || quickReplies.length > 13) {
      throw new Error("quickReplies must be an array of 1 to 13 quick replies");
    }
    return sendMessage(new MessengerClient(ctx), input, {
      text: input.text,
      quick_replies: quickReplies,
    });
  },
};

export default sendQuickReplies;
