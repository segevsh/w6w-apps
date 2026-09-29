import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";
import type { RedtailContact, RedtailContactInput } from "../lib/types.ts";

interface Input {
  contactId: number;
  type?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  taxId?: string;
  dob?: string;
  statusId?: number;
  categoryId?: number;
  sourceId?: number;
}

interface Output {
  contact: RedtailContact;
}

const contactUpdate: ActionDefinition<Input, Output> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact. Only the fields provided are changed.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "Crm::Contact::Individual", label: "Individual" },
        { value: "Crm::Contact::Business", label: "Business" },
        { value: "Crm::Contact::Trust", label: "Trust" },
        { value: "Crm::Contact::Association", label: "Association" },
        { value: "Crm::Contact::Union", label: "Union" },
      ],
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "middleName", label: "Middle name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "taxId", label: "Tax ID", type: "string", advanced: true },
    { key: "dob", label: "Date of birth", type: "date", advanced: true },
    { key: "statusId", label: "Status ID", type: "number", advanced: true },
    { key: "categoryId", label: "Category ID", type: "number", advanced: true },
    { key: "sourceId", label: "Source ID", type: "number", advanced: true },
  ],
  output: [
    { key: "contact.id", type: "number", label: "Contact ID" },
    { key: "contact.full_name", type: "string", label: "Full name" },
    { key: "contact.updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const body: RedtailContactInput = compact({
      type: input.type,
      first_name: input.firstName,
      middle_name: input.middleName,
      last_name: input.lastName,
      company_name: input.companyName,
      job_title: input.jobTitle,
      tax_id: input.taxId,
      dob: input.dob,
      status_id: input.statusId,
      category_id: input.categoryId,
      source_id: input.sourceId,
    });
    const res = await new RedtailClient(ctx).request<Output>(`/contacts/${input.contactId}`, {
      method: "PUT",
      body,
    });
    return res.data;
  },
};

export default contactUpdate;
