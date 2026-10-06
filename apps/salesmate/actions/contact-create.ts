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
  lastName: string;
  firstName?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  otherPhone?: string;
  company?: number;
  designation?: string;
  website?: string;
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

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact.",
  idempotent: false,
  params: [
    { key: "lastName", label: "Last name", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "mobile", label: "Mobile", type: "string" },
    { key: "phone", label: "Phone", type: "string", advanced: true },
    { key: "otherPhone", label: "Other phone", type: "string", advanced: true },
    { key: "company", label: "Company ID", type: "number", hint: "Existing company to associate." },
    { key: "designation", label: "Designation", type: "string", advanced: true },
    { key: "website", label: "Website", type: "string", advanced: true },
    ownerParam(true),
    ...socialParams,
    ...billingParams,
    currencyParam,
    tagsParam,
    customFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const { customFields: custom, ...fields } = input as Input;
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>("/contact/v4", {
      method: "POST",
      body: { ...customFields(custom), ...compact(fields) },
    });
    return data ?? {};
  },
};

export default contactCreate;
