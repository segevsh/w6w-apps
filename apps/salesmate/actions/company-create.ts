import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, SalesmateClient } from "../lib/client.ts";
import {
  billingParams,
  currencyParam,
  customFieldsParam,
  ownerParam,
  socialParams,
  tagsParam,
} from "../lib/params.ts";

interface Input {
  name: string;
  website?: string;
  phone?: string;
  otherPhone?: string;
  owner: number;
  skypeId?: string;
  linkedInHandle?: string;
  facebookHandle?: string;
  twitterHandle?: string;
  googlePlusHandle?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  currency?: string;
  tags?: string;
  customFields?: unknown;
}

const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Create a company.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "website", label: "Website", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "otherPhone", label: "Other phone", type: "string", advanced: true },
    ownerParam(true),
    ...socialParams,
    ...billingParams,
    currencyParam,
    tagsParam,
    customFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "website", type: "string", label: "Website" },
  ],

  async execute(input, ctx) {
    const { customFields: custom, ...fields } = input as Input;
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>("/company/v4", {
      method: "POST",
      body: { ...customFields(custom), ...compact(fields) },
    });
    return data ?? {};
  },
};

export default companyCreate;
