import type { ActionDefinition } from "@w6w/types";
import { compact, QuadernoClient } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName?: string;
  kind?: string;
  email?: string;
  phone?: string;
  country?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  streetLine1?: string;
  streetLine2?: string;
  taxId?: string;
  taxStatus?: string;
  language?: string;
  web?: string;
  notes?: string;
  processorId?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a customer or vendor contact.",
  idempotent: false,
  params: [
    {
      key: "firstName",
      label: "First name",
      type: "string",
      required: true,
      hint: "For a company contact, this holds the company name.",
    },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      options: [{ "value": "person", "label": "Person" }, {
        "value": "company",
        "label": "Company",
      }],
    },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "country", label: "Country", type: "string", hint: "2-letter ISO country code." },
    { key: "region", label: "Region", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "postalCode", label: "Postal code", type: "string" },
    { key: "streetLine1", label: "Street line 1", type: "string" },
    { key: "streetLine2", label: "Street line 2", type: "string" },
    { key: "taxId", label: "Tax ID", type: "string" },
    {
      key: "taxStatus",
      label: "Tax status",
      type: "select",
      options: [{ "value": "taxable", "label": "Taxable" }, {
        "value": "exempt",
        "label": "Exempt",
      }, { "value": "reverse", "label": "Reverse charge" }],
    },
    { key: "language", label: "Language", type: "string", hint: "2-letter ISO language code." },
    { key: "web", label: "Website", type: "string" },
    { key: "notes", label: "Notes", type: "string" },
    { key: "processorId", label: "Processor ID", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "permalink", type: "string", label: "Billing area URL" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request("/contacts", {
      method: "POST",
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        kind: input.kind,
        email: input.email,
        phone_1: input.phone,
        country: input.country,
        region: input.region,
        city: input.city,
        postal_code: input.postalCode,
        street_line_1: input.streetLine1,
        street_line_2: input.streetLine2,
        tax_id: input.taxId,
        tax_status: input.taxStatus,
        language: input.language,
        web: input.web,
        notes: input.notes,
        processor_id: input.processorId,
      }),
    });
  },
};

export default contactCreate;
