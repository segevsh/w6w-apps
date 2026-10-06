import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, nested } from "../lib/client.ts";

interface Input {
  name: string;
  trial_end: number;
  license_category: "free" | "starter" | "ai_meeting" | "business";
  industry?: string;
  reseller_external_id?: string;
  subscription_currency?: string;
  subscription_interval?: "month" | "year";
  min_seats?: number;
  max_seats?: number;
  locale?: string;
  time_zone?: string;
}

/** `POST /reseller/companies` */
const clientCompanyCreate: ActionDefinition<Input> = {
  key: "client-company-create",
  type: "perform",
  resource: "client-company",
  title: "Create Client Company",
  description:
    "Reseller only: create a client company with a Leexi trial. It has no team or user yet.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Must not contain `#` or `_`.",
    },
    {
      key: "trial_end",
      label: "Trial end",
      type: "number",
      required: true,
      hint: "Unix timestamp in seconds. A past date creates the company with an ended trial.",
      validation: { min: 0, integer: true },
    },
    {
      key: "license_category",
      label: "License category",
      type: "select",
      required: true,
      hint: "`starter` caps the seats at 5.",
      options: [{ value: "free", label: "free" }, { value: "starter", label: "starter" }, {
        value: "ai_meeting",
        label: "ai_meeting",
      }, { value: "business", label: "business" }],
    },
    {
      key: "industry",
      label: "Industry",
      type: "string",
    },
    {
      key: "reseller_external_id",
      label: "Your external ID",
      type: "string",
      hint: "Your own reference; must be unique among your client companies.",
    },
    {
      key: "subscription_currency",
      label: "Billing currency",
      type: "string",
      hint: "e.g. `eur`. Locked while a Stripe subscription is active.",
    },
    {
      key: "subscription_interval",
      label: "Billing interval",
      type: "select",
      options: [{ value: "month", label: "month" }, { value: "year", label: "year" }],
    },
    {
      key: "min_seats",
      label: "Minimum seats",
      type: "number",
      hint: "Minimum number of seats billed.",
      validation: { min: 0, integer: true },
    },
    {
      key: "max_seats",
      label: "Maximum seats",
      type: "number",
      hint: "Maximum number of licensed users.",
      validation: { min: 0, integer: true },
    },
    {
      key: "locale",
      label: "Default locale",
      type: "string",
      hint: "e.g. `en-US` or `fr-FR`. An unknown locale answers 422.",
    },
    {
      key: "time_zone",
      label: "Time zone",
      type: "string",
      hint: "e.g. `Europe/Paris`. An unknown time zone answers 422.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The record returned by Leexi (empty object for a delete)",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("POST", "/reseller/companies", {
      body: compact({
        name: input.name,
        trial_end: input.trial_end,
        industry: input.industry,
        reseller_external_id: input.reseller_external_id,
        subscription_currency: input.subscription_currency,
        subscription_interval: input.subscription_interval,
        company_setting: nested({
          license_category: input.license_category,
          min_seats: input.min_seats,
          max_seats: input.max_seats,
        }),
        setting: nested({ locale: input.locale, time_zone: input.time_zone }),
      }),
    });
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default clientCompanyCreate;
