import type { ActionDefinition } from "@w6w/types";
import { compact, ThanksioClient } from "../lib/client.ts";
import {
  audienceParams,
  mailerBody,
  type MailerInput,
  optionParams,
  styleParams,
} from "../lib/send.ts";

/**
 * `POST /api/v2/estimate/{postcard|windowedletter|windowlessletter|notecard|magnacard|giftcard}`
 * — "Price a … order without placing it … nothing is charged, nothing is printed or mailed, and
 * no order is created." The body is the matching send body, validated exactly as the send is.
 */
interface Input extends MailerInput {
  mailerType: string;
  size?: string;
  giftcardBrand?: string;
  giftcardAmountInCents?: number;
}

export const ESTIMATE_TYPES = [
  "postcard",
  "windowedletter",
  "windowlessletter",
  "notecard",
  "magnacard",
  "giftcard",
] as const;

const estimateOrder: ActionDefinition<Input> = {
  key: "estimate-order",
  type: "read",
  resource: "order",
  title: "Estimate Order",
  description: "Price a mailer without placing it: free, nothing is charged, printed or mailed, " +
    "and no order is created. Send the same inputs you would send to the matching Send action; " +
    "the vendor validates them exactly as the send would, so a payload that would be rejected " +
    "is rejected here too.",
  params: [
    {
      key: "mailerType",
      label: "Mailer type",
      type: "select",
      required: true,
      options: ESTIMATE_TYPES.map((t) => ({ value: t, label: t })),
    },
    ...audienceParams,
    ...styleParams,
    { key: "size", label: "Postcard size", type: "string", hint: "4x6, 6x9 or 6x11 (postcards)." },
    { key: "giftcardBrand", label: "Gift card brand", type: "string" },
    { key: "giftcardAmountInCents", label: "Gift card amount (cents)", type: "number" },
    ...optionParams,
  ],
  output: [
    { key: "estimate", type: "object", label: "Priced order (recipients, totals, test_mode)" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    if (!(ESTIMATE_TYPES as readonly string[]).includes(input.mailerType)) {
      throw new Error(`Mailer type must be one of ${ESTIMATE_TYPES.join(", ")}`);
    }
    const body = await new ThanksioClient(ctx).call<{ message?: string; data?: unknown }>(
      `/estimate/${input.mailerType}`,
      {
        method: "POST",
        body: {
          ...mailerBody(input),
          ...compact({
            size: input.size,
            giftcard_brand: input.giftcardBrand,
            giftcard_amount_in_cents: input.giftcardAmountInCents,
          }),
        },
      },
    );
    return { estimate: body.data ?? body, message: body.message };
  },
};

export default estimateOrder;
