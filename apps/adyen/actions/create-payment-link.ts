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
 * `POST /paymentLinks` returns HTTP 201. The link id is what get-payment-link and
 *
 * expire-payment-link take.
 */
interface Input {
  merchantAccount?: string;
  reference: string;
  currency: string;
  value: number;
  description?: string;
  expiresAt?: string;
  returnUrl?: string;
  countryCode?: string;
  shopperReference?: string;
  shopperEmail?: string;
  shopperLocale?: string;
  reusable?: boolean;
  manualCapture?: boolean;
  storePaymentMethodMode?: string;
  store?: string;
  requiredShopperFields?: unknown;
  allowedPaymentMethods?: unknown;
  blockedPaymentMethods?: unknown;
  lineItems?: unknown;
  metadata?: unknown;
  additionalFields?: unknown;
}

const createPaymentLinkSpec: BodySpec = {
  fields: [
    "reference",
    "description",
    "expiresAt",
    "returnUrl",
    "countryCode",
    "shopperReference",
    "shopperEmail",
    "shopperLocale",
    "reusable",
    "manualCapture",
    "storePaymentMethodMode",
    "store",
  ],
  json: [
    "requiredShopperFields",
    "allowedPaymentMethods",
    "blockedPaymentMethods",
    "lineItems",
    "metadata",
  ],
  amount: true,
};

const createPaymentLink: ActionDefinition<Input> = {
  key: "create-payment-link",
  type: "perform",
  resource: "payment-link",
  title: "Create Payment Link",
  description:
    "Create a hosted payment link to send to a shopper. Returns the link id, its url and status.",
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
      key: "description",
      label: "Description",
      type: "string",
      hint: "Shown to the shopper on the payment page.",
    },
    {
      key: "expiresAt",
      label: "Expires at",
      type: "string",
      hint: "ISO 8601 with time zone offset. At most 70 days out; defaults to 24 hours.",
    },
    {
      key: "returnUrl",
      label: "Return URL",
      type: "string",
      hint: "Shown as a Continue button after payment.",
    },
    { key: "countryCode", label: "Country code", type: "string" },
    shopperReferenceParam(),
    { key: "shopperEmail", label: "Shopper email", type: "string" },
    { key: "shopperLocale", label: "Shopper locale", type: "string" },
    {
      key: "reusable",
      label: "Reusable",
      type: "boolean",
      hint: "Allow the link to be paid more than once.",
    },
    {
      key: "manualCapture",
      label: "Manual capture",
      type: "boolean",
      hint: "Authorise only; capture later with capture-payment.",
    },
    {
      key: "storePaymentMethodMode",
      label: "Store payment method",
      type: "select",
      options: [{ value: "askForConsent", label: "askForConsent" }, {
        value: "disabled",
        label: "disabled",
      }, { value: "enabled", label: "enabled" }],
    },
    { key: "store", label: "Store", type: "string" },
    {
      key: "requiredShopperFields",
      label: "Required shopper fields",
      type: "json",
      hint:
        "JSON array of billingAddress, deliveryAddress, shopperEmail, shopperName, telephoneNumber.",
    },
    { key: "allowedPaymentMethods", label: "Allowed payment methods", type: "json" },
    { key: "blockedPaymentMethods", label: "Blocked payment methods", type: "json" },
    { key: "lineItems", label: "Line items", type: "json" },
    { key: "metadata", label: "Metadata", type: "json" },
    additionalFieldsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Link ID" },
    { key: "url", type: "string", label: "Payment link URL" },
    { key: "status", type: "string", label: "Status" },
    { key: "expiresAt", type: "string", label: "Expires at" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "amount", type: "object", label: "Amount" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, createPaymentLinkSpec);
    return new AdyenClient(ctx).post("/paymentLinks", body);
  },
};

export default createPaymentLink;
