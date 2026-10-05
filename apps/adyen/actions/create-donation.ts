import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import {
  additionalFieldsParam,
  currencyParam,
  merchantAccountParam,
  referenceParam,
  shopperReferenceParam,
  valueParam,
} from "../lib/params.ts";

/**
 * `POST /donations`. Only `amount`, `merchantAccount`, `reference` and `returnUrl` are required by
 *
 * the spec; Adyen's donation flow needs the campaign id and token in practice.
 */
interface Input {
  merchantAccount?: string;
  reference: string;
  currency: string;
  value: number;
  returnUrl: string;
  donationCampaignId?: string;
  donationToken?: string;
  donationOriginalPspReference?: string;
  paymentMethod?: unknown;
  shopperReference?: string;
  shopperInteraction?: string;
  additionalFields?: unknown;
}

const createDonationSpec: BodySpec = {
  fields: [
    "reference",
    "returnUrl",
    "donationCampaignId",
    "donationToken",
    "donationOriginalPspReference",
    "shopperReference",
    "shopperInteraction",
  ],
  json: ["paymentMethod"],
  amount: true,
};

const createDonation: ActionDefinition<Input> = {
  key: "create-donation",
  type: "perform",
  resource: "donation",
  title: "Create Donation",
  description: "Make a donation to a campaign using the donation token from a completed payment.",
  idempotent: false,
  params: [
    merchantAccountParam,
    referenceParam("Reference", true),
    currencyParam,
    valueParam,
    { key: "returnUrl", label: "Return URL", type: "string", required: true },
    {
      key: "donationCampaignId",
      label: "Donation campaign ID",
      type: "string",
      hint: "From list-donation-campaigns.",
    },
    {
      key: "donationToken",
      label: "Donation token",
      type: "string",
      hint: "The donationToken of the original payment response.",
    },
    {
      key: "donationOriginalPspReference",
      label: "Original PSP reference",
      type: "string",
      hint: "The pspReference of the payment the donation rides on.",
    },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "json",
      hint: 'For example {"type":"scheme","storedPaymentMethodId":"..."}.',
    },
    shopperReferenceParam(),
    {
      key: "shopperInteraction",
      label: "Shopper interaction",
      type: "select",
      options: [
        { value: "Ecommerce", label: "Ecommerce" },
        { value: "ContAuth", label: "ContAuth" },
        { value: "Moto", label: "Moto" },
        { value: "POS", label: "POS" },
      ],
      hint:
        "Ecommerce for a shopper present online; ContAuth for a stored-credential charge with the shopper absent.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Donation ID" },
    { key: "status", type: "string", label: "Status (completed, pending, refused)" },
    { key: "donationAccount", type: "string", label: "Donation account" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "payment", type: "object", label: "Payment" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, createDonationSpec);
    return new AdyenClient(ctx).post("/donations", body);
  },
};

export default createDonation;
