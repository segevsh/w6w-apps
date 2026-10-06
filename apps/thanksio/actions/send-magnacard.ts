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

/** `POST /api/v2/send/magnacard` — Send a Magnacard. Needs an image template or a front image URL. */
interface Input extends MailerInput {
  useCustomBackground?: boolean;
  customBackgroundImage?: string;
}

const sendMagnacard: ActionDefinition<Input> = {
  key: "send-magnacard",
  type: "perform",
  resource: "order",
  title: "Send Magnacard",
  description: SPEND_WARNING + "Send a Magnacard. Needs an image template or a front image URL.",
  // The vendor accepts no idempotency key: a retried send places and charges a second order.
  idempotent: false,
  params: [
    ...audienceParams,
    ...styleParams,
    { key: "useCustomBackground", label: "Use custom background", type: "boolean" },
    { key: "customBackgroundImage", label: "Custom background image URL", type: "string" },
    ...optionParams,
    previewParam,
  ],
  output: [...sendOutput],

  async execute(input, ctx) {
    return await postMailer(ctx, "/send/magnacard", {
      ...mailerBody(input),
      ...compact({
        use_custom_background: input.useCustomBackground,
        custom_background_image: input.customBackgroundImage,
      }),
    });
  },
};

export default sendMagnacard;
