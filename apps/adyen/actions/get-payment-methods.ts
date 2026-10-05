import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import {
  additionalFieldsParam,
  currencyParam,
  merchantAccountParam,
  shopperReferenceParam,
  valueParam,
} from "../lib/params.ts";

/**
 * `POST /paymentMethods` is a lookup — it creates nothing — so it is a `read`. The amount is
 *
 * optional but currency and value must be given together.
 */
interface Input {
  merchantAccount?: string;
  countryCode?: string;
  currency?: string;
  value?: number;
  shopperLocale?: string;
  shopperReference?: string;
  channel?: string;
  store?: string;
  allowedPaymentMethods?: unknown;
  blockedPaymentMethods?: unknown;
  additionalFields?: unknown;
}

const getPaymentMethodsSpec: BodySpec = {
  fields: ["countryCode", "shopperLocale", "shopperReference", "channel", "store"],
  json: ["allowedPaymentMethods", "blockedPaymentMethods"],
  amount: "optional",
};

const getPaymentMethods: ActionDefinition<Input> = {
  key: "get-payment-methods",
  type: "read",
  resource: "payment",
  title: "Get Payment Methods",
  description:
    "List the payment methods available to a shopper, given an amount, country and channel.",
  params: [
    merchantAccountParam,
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      hint: "Two-letter ISO 3166-1 country code.",
    },
    { ...currencyParam, required: false },
    { ...valueParam, required: false },
    { key: "shopperLocale", label: "Shopper locale", type: "string", placeholder: "en-US" },
    shopperReferenceParam(),
    {
      key: "channel",
      label: "Channel",
      type: "select",
      options: [{ value: "iOS", label: "iOS" }, { value: "Android", label: "Android" }, {
        value: "Web",
        label: "Web",
      }],
    },
    { key: "store", label: "Store", type: "string" },
    {
      key: "allowedPaymentMethods",
      label: "Allowed payment methods",
      type: "json",
      hint: "JSON array of payment method types to show.",
    },
    {
      key: "blockedPaymentMethods",
      label: "Blocked payment methods",
      type: "json",
      hint: "JSON array of payment method types to hide.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "paymentMethods", type: "array", label: "Available payment methods" },
    { key: "storedPaymentMethods", type: "array", label: "The shopper's stored payment methods" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, getPaymentMethodsSpec);
    return new AdyenClient(ctx).post("/paymentMethods", body);
  },
};

export default getPaymentMethods;
