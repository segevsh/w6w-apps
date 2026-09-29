import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";
import type { RedtailContactInput } from "../lib/types.ts";

interface Input {
  type: string;
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
  success: boolean;
  id: number;
}

const CONTACT_TYPES = [
  { value: "Crm::Contact::Individual", label: "Individual" },
  { value: "Crm::Contact::Business", label: "Business" },
  { value: "Crm::Contact::Trust", label: "Trust" },
  { value: "Crm::Contact::Association", label: "Association" },
  { value: "Crm::Contact::Union", label: "Union" },
];

const contactCreate: ActionDefinition<Input, Output> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new contact (person, business, trust, association or union).",
  idempotent: false,
  params: [
    { key: "type", label: "Type", type: "select", required: true, options: CONTACT_TYPES },
    { key: "firstName", label: "First name", type: "string" },
    { key: "middleName", label: "Middle name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "companyName",
      label: "Company name",
      type: "string",
      hint: "For a Business/Trust/Association/Union contact.",
    },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "taxId", label: "Tax ID", type: "string", advanced: true },
    { key: "dob", label: "Date of birth", type: "date", advanced: true },
    { key: "statusId", label: "Status ID", type: "number", advanced: true },
    { key: "categoryId", label: "Category ID", type: "number", advanced: true },
    { key: "sourceId", label: "Source ID", type: "number", advanced: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "id", type: "number", label: "New contact ID" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Redtail contact", { type: input.type });
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
    const res = await new RedtailClient(ctx).request<Output>("/contacts", { method: "POST", body });
    return res.data;
  },
};

export default contactCreate;
