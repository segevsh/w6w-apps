import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, SalesmateClient } from "../lib/client.ts";
import {
  billingParams,
  currencyParam,
  customFieldsParam,
  idParam,
  ownerParam,
  socialParams,
  tagsParam,
} from "../lib/params.ts";

interface Input {
  contactId: number;
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

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact. Salesmate's update takes the full required field set, not just the changes.",
  idempotent: true,
  params: [
    idParam("contactId", "Contact ID"),
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
    const { contactId: _id, customFields: custom, ...fields } = input as Input & {
      contactId?: number;
    };
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>(
      `/contact/v4/${input.contactId}`,
      {
        method: "PUT",
        body: { ...customFields(custom), ...compact(fields) },
      },
    );
    return data ?? {};
  },
};

export default contactUpdate;
