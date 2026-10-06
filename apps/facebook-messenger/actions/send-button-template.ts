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
  buttons: unknown;
}

/**
 * Button template — a text of up to 640 characters with 1-3 attached buttons.
 * Button objects are passed through as documented (`web_url`: `{type, url, title}`,
 * `postback`: `{type, title, payload}`), so every button type Meta documents works.
 */
const sendButtonTemplate: ActionDefinition<Input, SendResponse> = {
  key: "send-button-template",
  type: "perform",
  resource: "message",
  title: "Send Button Template",
  description: "Send a text message with up to three buttons.",
  idempotent: false,
  params: [
    recipientParam,
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "Up to 640 characters, shown above the buttons.",
    },
    {
      key: "buttons",
      label: "Buttons (JSON array)",
      type: "json",
      required: true,
      hint:
        'One to three buttons, e.g. [{"type":"web_url","url":"https://example.com","title":"Visit"},{"type":"postback","title":"Start","payload":"START"}]',
    },
    ...sendOptionParams,
  ],
  output: sendOutput,

  execute(input, ctx) {
    const buttons = jsonParam<unknown[]>("buttons", input.buttons);
    if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 3) {
      throw new Error("buttons must be an array of 1 to 3 buttons");
    }
    return sendMessage(new MessengerClient(ctx), input, {
      attachment: {
        type: "template",
        payload: { template_type: "button", text: input.text, buttons },
      },
    });
  },
};

export default sendButtonTemplate;
