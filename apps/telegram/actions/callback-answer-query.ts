import type { ActionDefinition } from "@w6w/types";
import { TelegramClient, unset } from "../lib/client.ts";

interface Input {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
  url?: string;
  cacheTime?: number;
}

/**
 * Every inline-keyboard tap raises a callback query that Telegram expects to be
 * acknowledged — until it is, the client shows a loading spinner on the button.
 */
const callbackAnswerQuery: ActionDefinition<Input, boolean> = {
  key: "callback-answer-query",
  type: "perform",
  resource: "callback",
  title: "Answer Callback Query",
  description: "Acknowledge an inline-keyboard button press, optionally showing a toast or alert.",
  idempotent: true,
  params: [
    {
      key: "callbackQueryId",
      label: "Callback query ID",
      type: "string",
      required: true,
      hint: "The `id` of the incoming callback query.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      validation: { maxLength: 200 },
      hint: "Shown as a toast, or as an alert when 'Show alert' is on.",
    },
    {
      key: "showAlert",
      label: "Show alert",
      type: "boolean",
      hint: "Show a modal the user must dismiss instead of a transient toast.",
    },
    {
      key: "url",
      label: "URL",
      type: "string",
      hint: "URL the client opens. Only games and t.me bot-start links are accepted.",
    },
    {
      key: "cacheTime",
      label: "Cache time (seconds)",
      type: "number",
      hint: "How long clients may cache this answer.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Answered" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<boolean>("answerCallbackQuery", {
      body: {
        callback_query_id: input.callbackQueryId,
        text: unset(input.text),
        show_alert: input.showAlert,
        url: unset(input.url),
        cache_time: input.cacheTime,
      },
    });
  },
};

export default callbackAnswerQuery;
