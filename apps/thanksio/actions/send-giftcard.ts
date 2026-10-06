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

/** `POST /api/v2/send/giftcard` — Send a folded 4.25x5.5 notecard with a gift card inside. The gift card value is charged on top of postage. */
interface Input extends MailerInput {
  giftcardBrand?: string;
  giftcardAmountInCents?: number;
}

const sendGiftcard: ActionDefinition<Input> = {
  key: "send-giftcard",
  type: "perform",
  resource: "order",
  title: "Send Gift Card",
  description: SPEND_WARNING +
    "Send a folded 4.25x5.5 notecard with a gift card inside. The gift card value is charged on top of postage.",
  // The vendor accepts no idempotency key: a retried send places and charges a second order.
  idempotent: false,
  params: [
    ...audienceParams,
    ...styleParams,
    {
      key: "giftcardBrand",
      label: "Gift card brand",
      type: "string",
      hint: "A brand_code from the List Gift Card Brands action, e.g. amazonus.",
    },
    {
      key: "giftcardAmountInCents",
      label: "Gift card amount (cents)",
      type: "number",
      hint: "Must be one of the brand's available_amounts, in cents (500 = $5).",
    },
    ...optionParams,
    previewParam,
  ],
  output: [...sendOutput],

  async execute(input, ctx) {
    return await postMailer(ctx, "/send/giftcard", {
      ...mailerBody(input),
      ...compact({
        giftcard_brand: input.giftcardBrand,
        giftcard_amount_in_cents: input.giftcardAmountInCents,
      }),
    });
  },
};

export default sendGiftcard;
