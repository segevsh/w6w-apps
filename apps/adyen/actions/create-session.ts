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
 * `POST /sessions` returns HTTP 201. `sessionData` is what a client-side Drop-in or Components
 *
 * needs; the session id plus its `sessionResult` read the outcome back (get-session-result).
 */
interface Input {
  merchantAccount?: string;
  reference: string;
  currency: string;
  value: number;
  returnUrl: string;
  countryCode?: string;
  shopperReference?: string;
  shopperEmail?: string;
  shopperLocale?: string;
  mode?: string;
  storePaymentMethodMode?: string;
  recurringProcessingModel?: string;
  expiresAt?: string;
  store?: string;
  channel?: string;
  lineItems?: unknown;
  metadata?: unknown;
  additionalFields?: unknown;
}

const createSessionSpec: BodySpec = {
  fields: [
    "reference",
    "returnUrl",
    "countryCode",
    "shopperReference",
    "shopperEmail",
    "shopperLocale",
    "mode",
    "storePaymentMethodMode",
    "recurringProcessingModel",
    "expiresAt",
    "store",
    "channel",
  ],
  json: ["lineItems", "metadata"],
  amount: true,
};

const createSession: ActionDefinition<Input> = {
  key: "create-session",
  type: "perform",
  resource: "session",
  title: "Create Payment Session",
  description:
    "Create a Checkout session for Drop-in or Components, or a hosted checkout page. Returns the session id, its sessionData and (for hosted mode) a url.",
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
      key: "returnUrl",
      label: "Return URL",
      type: "string",
      required: true,
      hint: "Where the shopper returns after a redirect. For web, include http:// or https://.",
    },
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      hint: "Two-letter ISO 3166-1 country code; filters the payment methods offered.",
    },
    shopperReferenceParam(),
    { key: "shopperEmail", label: "Shopper email", type: "string" },
    { key: "shopperLocale", label: "Shopper locale", type: "string", placeholder: "en-US" },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [{ value: "embedded", label: "embedded" }, { value: "hosted", label: "hosted" }],
      hint:
        "embedded (default) is Drop-in or Components; hosted returns a url to a Hosted Checkout page.",
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
    recurringModelParam,
    {
      key: "expiresAt",
      label: "Expires at",
      type: "string",
      hint: "ISO 8601 with time zone. Defaults to one hour after creation.",
    },
    {
      key: "store",
      label: "Store",
      type: "string",
      hint: "Store reference, for Adyen for Platforms or store-filtered methods.",
    },
    {
      key: "channel",
      label: "Channel",
      type: "select",
      options: [{ value: "iOS", label: "iOS" }, { value: "Android", label: "Android" }, {
        value: "Web",
        label: "Web",
      }],
    },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      hint: "Array of line items (invoice detail, required by some payment methods).",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Key-value pairs, at most 20 entries.",
    },
    additionalFieldsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "sessionData", type: "string", label: "Session data (hand to the client)" },
    { key: "expiresAt", type: "string", label: "Expires at" },
    { key: "url", type: "string", label: "Hosted checkout URL" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "amount", type: "object", label: "Amount" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, createSessionSpec);
    return new AdyenClient(ctx).post("/sessions", body);
  },
};

export default createSession;
