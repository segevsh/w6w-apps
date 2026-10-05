import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import {
  additionalFieldsParam,
  currencyParam,
  merchantAccountParam,
  recurringModelParam,
  referenceParam,
  shopperReferenceParam,
  valueParam,
} from "../lib/params.ts";

/**
 * `POST /payments`. Not idempotent as far as this app can promise: the workflow invocation id is
 *
 * sent as `Idempotency-Key`, but without one a retry could charge twice.
 */
interface Input {
  merchantAccount?: string;
  reference: string;
  currency: string;
  value: number;
  paymentMethod: unknown;
  returnUrl: string;
  shopperReference?: string;
  shopperEmail?: string;
  shopperIP?: string;
  shopperInteraction?: string;
  recurringProcessingModel?: string;
  storePaymentMethod?: boolean;
  countryCode?: string;
  captureDelayHours?: number;
  browserInfo?: unknown;
  lineItems?: unknown;
  metadata?: unknown;
  additionalData?: unknown;
  additionalFields?: unknown;
}

const createPaymentSpec: BodySpec = {
  fields: [
    "reference",
    "returnUrl",
    "shopperReference",
    "shopperEmail",
    "shopperIP",
    "shopperInteraction",
    "recurringProcessingModel",
    "storePaymentMethod",
    "countryCode",
    "captureDelayHours",
  ],
  json: ["paymentMethod", "browserInfo", "lineItems", "metadata", "additionalData"],
  amount: true,
};

const createPayment: ActionDefinition<Input> = {
  key: "create-payment",
  type: "perform",
  resource: "payment",
  title: "Create Payment",
  description:
    "Start a payment with a payment method object. Returns a resultCode, and an action when the shopper must authenticate or be redirected.",
  idempotent: false,
  params: [
    merchantAccountParam,
    referenceParam(
      "Reference",
      true,
      "Your unique reference for the payment. Maximum length 80 characters.",
    ),
    currencyParam,
    valueParam,
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "json",
      required: true,
      hint:
        'The payment method and its details, for example {"type":"scheme","storedPaymentMethodId":"..."}.',
    },
    {
      key: "returnUrl",
      label: "Return URL",
      type: "string",
      required: true,
      hint: "Where the shopper returns after a redirect.",
    },
    shopperReferenceParam(),
    { key: "shopperEmail", label: "Shopper email", type: "string" },
    { key: "shopperIP", label: "Shopper IP", type: "string" },
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
    recurringModelParam,
    {
      key: "storePaymentMethod",
      label: "Store payment method",
      type: "boolean",
      hint: "Tokenise the payment details for later use (needs a shopper reference).",
    },
    { key: "countryCode", label: "Country code", type: "string" },
    {
      key: "captureDelayHours",
      label: "Capture delay (hours)",
      type: "number",
      hint:
        "Hours between authorisation and automatic capture. Leave empty for the account default.",
    },
    {
      key: "browserInfo",
      label: "Browser info",
      type: "json",
      hint: "The shopper browser object, required for 3D Secure on web.",
    },
    { key: "lineItems", label: "Line items", type: "json" },
    { key: "metadata", label: "Metadata", type: "json" },
    {
      key: "additionalData",
      label: "Additional data",
      type: "json",
      hint: "Extra data for the payment, an object of strings.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "resultCode", type: "string", label: "Result code" },
    { key: "pspReference", type: "string", label: "PSP reference" },
    { key: "merchantReference", type: "string", label: "Merchant reference" },
    { key: "refusalReason", type: "string", label: "Refusal reason" },
    { key: "refusalReasonCode", type: "string", label: "Refusal reason code" },
    { key: "action", type: "object", label: "Action the client must perform" },
    { key: "additionalData", type: "object", label: "Additional data" },
    { key: "amount", type: "object", label: "Amount" },
    { key: "donationToken", type: "string", label: "Donation token" },
    { key: "fraudResult", type: "object", label: "Fraud result" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, createPaymentSpec);
    return new AdyenClient(ctx).post("/payments", body);
  },
};

export default createPayment;
