import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import { additionalFieldsParam, merchantAccountParam } from "../lib/params.ts";

/**
 * `POST /cardDetails` — a lookup. Either `cardNumber` or `encryptedCardNumber` is needed; neither
 *
 * is marked required in the spec, so the action checks.
 */
interface Input {
  merchantAccount?: string;
  encryptedCardNumber?: string;
  cardNumber?: string;
  countryCode?: string;
  supportedBrands?: unknown;
  additionalFields?: unknown;
}

const getCardDetailsSpec: BodySpec = {
  fields: ["cardNumber", "encryptedCardNumber", "countryCode"],
  json: ["supportedBrands"],
};

const getCardDetails: ActionDefinition<Input> = {
  key: "get-card-details",
  type: "read",
  resource: "payment",
  title: "Get Card Details",
  description: "Get the brands, funding source and issuing country of a card from its number.",
  params: [
    merchantAccountParam,
    {
      key: "encryptedCardNumber",
      label: "Encrypted card number",
      type: "secret",
      hint: "The card number encrypted with Adyen's client-side library. Preferred.",
    },
    {
      key: "cardNumber",
      label: "Card number",
      type: "secret",
      hint:
        "The first 6 to 11 digits. Sending a clear card number puts your workflow in PCI scope; prefer the encrypted form.",
    },
    { key: "countryCode", label: "Country code", type: "string" },
    {
      key: "supportedBrands",
      label: "Supported brands",
      type: "json",
      hint: "JSON array of card brands you accept.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "brands", type: "array", label: "Card brands" },
    { key: "fundingSource", type: "string", label: "Funding source" },
    { key: "isCardCommercial", type: "boolean", label: "Commercial card" },
    { key: "issuingCountryCode", type: "string", label: "Issuing country" },
  ],

  execute(input, ctx) {
    if (!input.cardNumber && !input.encryptedCardNumber) {
      throw new Error("give either encryptedCardNumber or cardNumber");
    }
    const body = buildBody(ctx, input, getCardDetailsSpec);
    return new AdyenClient(ctx).post("/cardDetails", body);
  },
};

export default getCardDetails;
