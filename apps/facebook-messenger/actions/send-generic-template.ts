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
  elements: unknown;
  sharable?: boolean;
}

/**
 * Generic template — a title, subtitle, image and up to 3 buttons per element, and up to
 * 10 elements which Messenger renders as a horizontally scrollable carousel.
 */
const sendGenericTemplate: ActionDefinition<Input, SendResponse> = {
  key: "send-generic-template",
  type: "perform",
  resource: "message",
  title: "Send Generic Template (Carousel)",
  description: "Send a card, or a carousel of up to ten cards, with an image and buttons.",
  idempotent: false,
  params: [
    recipientParam,
    {
      key: "elements",
      label: "Elements (JSON array)",
      type: "json",
      required: true,
      hint:
        'Up to 10 elements: [{"title":"Welcome!","subtitle":"…","image_url":"https://…","default_action":{"type":"web_url","url":"https://…"},"buttons":[…]}]. Title and subtitle are limited to 80 characters; up to 3 buttons each.',
    },
    {
      key: "sharable",
      label: "Show share button",
      type: "boolean",
      default: false,
    },
    ...sendOptionParams,
  ],
  output: sendOutput,

  execute(input, ctx) {
    const elements = jsonParam<unknown[]>("elements", input.elements);
    if (!Array.isArray(elements) || elements.length < 1 || elements.length > 10) {
      throw new Error("elements must be an array of 1 to 10 elements");
    }
    const payload: Record<string, unknown> = { template_type: "generic", elements };
    if (input.sharable) payload.sharable = true;
    return sendMessage(new MessengerClient(ctx), input, {
      attachment: { type: "template", payload },
    });
  },
};

export default sendGenericTemplate;
