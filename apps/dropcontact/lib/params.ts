import type { Param } from "@w6w/types";

export const sirenParam: Param = {
  key: "siren",
  label: "Include French company registry data",
  type: "boolean",
  hint: "Adds SIREN, NAF code, VAT number, company address and company leader data.",
};

export const languageParam: Param = {
  key: "language",
  label: "Result language",
  type: "select",
  options: [
    { value: "en", label: "English" },
    { value: "fr", label: "French" },
  ],
  hint: "Dropcontact answers in French when this is not set.",
};

export const callbackParam: Param = {
  key: "customCallbackUrl",
  label: "Webhook URL for this request",
  type: "string",
  hint: "Optional. Dropcontact POSTs the finished result here. Overrides the account's default " +
    "webhook for this request only.",
};
