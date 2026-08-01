import type { ActionDefinition } from "@w6w/types";
import { customFields, FreshdeskClient, unset } from "../lib/client.ts";

interface Input {
  contactId: number;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  companyId?: number;
  customFields?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Change a contact's fields. Only the ones you set are touched.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string", row: "identify" },
    { key: "phone", label: "Phone", type: "string", row: "identify" },
    { key: "mobile", label: "Mobile", type: "string", row: "identify" },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    { key: "companyId", label: "Company ID", type: "number", advanced: true },
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
    return new FreshdeskClient(ctx).request(`/contacts/${input.contactId}`, {
      method: "PUT",
      body: {
        name: unset(input.name),
        email: unset(input.email),
        phone: unset(input.phone),
        mobile: unset(input.mobile),
        job_title: unset(input.jobTitle),
        company_id: input.companyId,
        custom_fields: customFields(input.customFields),
      },
    });
  },
};

export default contactUpdate;
