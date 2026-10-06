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

/** `POST /api/v2/send/windowedletter` — Send a letter in a windowed envelope (the recipient address shows through the window). */
interface Input extends MailerInput {
  additionalPagesUrl?: string;
  pdfOnlyUrl?: string;
}

const sendWindowedLetter: ActionDefinition<Input> = {
  key: "send-windowed-letter",
  type: "perform",
  resource: "order",
  title: "Send Windowed Letter",
  description: SPEND_WARNING +
    "Send a letter in a windowed envelope (the recipient address shows through the window).",
  // The vendor accepts no idempotency key: a retried send places and charges a second order.
  idempotent: false,
  params: [
    ...audienceParams,
    ...styleParams,
    { key: "additionalPagesUrl", label: "Additional pages URL", type: "string" },
    {
      key: "pdfOnlyUrl",
      label: "Full PDF URL",
      type: "string",
      hint: "A PDF used as the entire mailer; no cover letter is generated.",
    },
    ...optionParams,
    previewParam,
  ],
  output: [...sendOutput],

  async execute(input, ctx) {
    return await postMailer(ctx, "/send/windowedletter", {
      ...mailerBody(input),
      ...compact({
        additional_pages_url: input.additionalPagesUrl,
        pdf_only_url: input.pdfOnlyUrl,
      }),
    });
  },
};

export default sendWindowedLetter;
