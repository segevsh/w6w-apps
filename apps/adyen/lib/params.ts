import type { Param } from "@w6w/types";

/** Shared param definitions. */

export const merchantAccountParam: Param = {
  key: "merchantAccount",
  label: "Merchant account",
  type: "string",
  hint: "The Adyen merchant account to act on. Leave empty to use the one stored on the " +
    "connection.",
};

export const currencyParam: Param = {
  key: "currency",
  label: "Currency",
  type: "string",
  required: true,
  placeholder: "EUR",
  hint: "Three-letter ISO 4217 currency code.",
  validation: { minLength: 3, maxLength: 3 },
};

export const valueParam: Param = {
  key: "value",
  label: "Amount (minor units)",
  type: "number",
  required: true,
  hint: "Whole minor units: 1000 is 10.00 EUR but 1000 JPY. Adyen's decimal places differ per " +
    "currency.",
  validation: { min: 0, integer: true },
};

export const referenceParam = (label: string, required = false, hint?: string): Param => ({
  key: "reference",
  label,
  type: "string",
  required,
  hint: hint ?? "Your own reference. Maximum length 80 characters.",
});

export const pspReferenceParam: Param = {
  key: "paymentPspReference",
  label: "Payment PSP reference",
  type: "string",
  required: true,
  hint: "The pspReference Adyen returned when the payment was authorised.",
};

export const additionalFieldsParam: Param = {
  key: "additionalFields",
  label: "Additional fields",
  type: "json",
  hint: "Any other field of this request that Adyen documents, as a JSON object. Merged under " +
    "the fields above, which win on a clash.",
};

export const shopperReferenceParam = (required = false): Param => ({
  key: "shopperReference",
  label: "Shopper reference",
  type: "string",
  required,
  hint: "Your unique id for the shopper (a user or account id). Minimum length 3 characters; " +
    "do not use personally identifiable information.",
});

export const recurringModelParam: Param = {
  key: "recurringProcessingModel",
  label: "Recurring processing model",
  type: "select",
  options: [
    { value: "CardOnFile", label: "CardOnFile" },
    { value: "Subscription", label: "Subscription" },
    { value: "UnscheduledCardOnFile", label: "UnscheduledCardOnFile" },
  ],
};
