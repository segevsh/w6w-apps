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

/** `POST /api/v2/send/notecard` — Send a folded 4.25x5.5 notecard in an envelope. Needs an image template or a front image URL. */
interface Input extends MailerInput {
  useCustomBackground?: boolean;
  customBackgroundImage?: string;
}

const sendNotecard: ActionDefinition<Input> = {
  key: "send-notecard",
  type: "perform",
  resource: "order",
  title: "Send Notecard",
  description: SPEND_WARNING +
    "Send a folded 4.25x5.5 notecard in an envelope. Needs an image template or a front image URL.",
  // The vendor accepts no idempotency key: a retried send places and charges a second order.
  idempotent: false,
  params: [
    ...audienceParams,
    ...styleParams,
    { key: "useCustomBackground", label: "Use custom interior background", type: "boolean" },
    { key: "customBackgroundImage", label: "Custom interior background URL", type: "string" },
    ...optionParams,
    previewParam,
  ],
  output: [...sendOutput],

  async execute(input, ctx) {
    return await postMailer(ctx, "/send/notecard", {
      ...mailerBody(input),
      ...compact({
        use_custom_background: input.useCustomBackground,
        custom_background_image: input.customBackgroundImage,
      }),
    });
  },
};

export default sendNotecard;
