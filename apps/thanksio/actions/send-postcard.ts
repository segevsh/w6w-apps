import type { ActionDefinition } from "@w6w/types";
import { compact } from "../lib/client.ts";
import {
  audienceParams,
  mailerBody,
  type MailerInput,
  optionParams,
  postMailer,
  previewParam,
  sendOutput,
  SPEND_WARNING,
  styleParams,
} from "../lib/send.ts";

/** `POST /api/v2/send/postcard` — Send a 4x6, 6x9 or 6x11 postcard to a mailing list, inline recipients or a radius search. */
interface Input extends MailerInput {
  size?: string;
  useCustomBackground?: boolean;
  customBackgroundImage?: string;
}

const sendPostcard: ActionDefinition<Input> = {
  key: "send-postcard",
  type: "perform",
  resource: "order",
  title: "Send Postcard",
  description: SPEND_WARNING +
    "Send a 4x6, 6x9 or 6x11 postcard to a mailing list, inline recipients or a radius search.",
  // The vendor accepts no idempotency key: a retried send places and charges a second order.
  idempotent: false,
  params: [
    ...audienceParams,
    ...styleParams,
    {
      key: "size",
      label: "Size",
      type: "select",
      options: [
        { value: "4x6", label: "4x6" },
        { value: "6x9", label: "6x9" },
        { value: "6x11", label: "6x11" },
      ],
    },
    { key: "useCustomBackground", label: "Use custom background", type: "boolean" },
    { key: "customBackgroundImage", label: "Custom background image URL", type: "string" },
    ...optionParams,
    previewParam,
  ],
  output: [...sendOutput],

  async execute(input, ctx) {
    return await postMailer(ctx, "/send/postcard", {
      ...mailerBody(input),
      ...compact({
        size: input.size,
        use_custom_background: input.useCustomBackground,
        custom_background_image: input.customBackgroundImage,
      }),
    });
  },
};

export default sendPostcard;
