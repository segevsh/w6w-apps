import type { ActionDefinition } from "@w6w/types";
import { customFields, FreshdeskClient, unset } from "../lib/client.ts";

interface Input {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  twitterId?: string;
  companyId?: number;
  jobTitle?: string;
  customFields?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact (end user). One of email, phone or twitterId is required.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", row: "identify" },
    { key: "phone", label: "Phone", type: "string", row: "identify" },
    { key: "mobile", label: "Mobile", type: "string", row: "identify" },
    { key: "twitterId", label: "Twitter handle", type: "string", advanced: true },
    { key: "companyId", label: "Company ID", type: "number", advanced: true },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: '{ "customer_type": "vip" }',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new FreshdeskClient(ctx).request("/contacts", {
      method: "POST",
      body: {
        name: input.name,
        email: unset(input.email),
        phone: unset(input.phone),
        mobile: unset(input.mobile),
        twitter_id: unset(input.twitterId),
        company_id: input.companyId,
        job_title: unset(input.jobTitle),
        custom_fields: customFields(input.customFields),
      },
    });
  },
};

export default contactCreate;
