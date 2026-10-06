import type { ActionDefinition } from "@w6w/types";
import { asJson, asObject, ClientifyClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/companies/` — Create a company. Clientify does not de-duplicate on a retry, so this action is not marked idempotent.
 */
interface Input {
  name: string;
  businessName?: string;
  companySector?: string;
  taxpayerIdentificationNumber?: string;
  numberOfEmployees?: number;
  owner?: string;
  emails?: unknown;
  phones?: unknown;
  websites?: unknown;
  addresses?: unknown;
  extra?: unknown;
}

const companyCreate: ActionDefinition<Input, unknown> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description:
    "Create a company. Clientify does not de-duplicate on a retry, so this action is not marked idempotent.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "businessName", label: "Business name", type: "string" },
    { key: "companySector", label: "Sector", type: "string", hint: "Sector NAME, e.g. Industria." },
    { key: "taxpayerIdentificationNumber", label: "Taxpayer ID", type: "string" },
    {
      key: "numberOfEmployees",
      label: "Number of employees (bracket)",
      type: "number",
      hint:
        "Bracket id: 1 = 1-10, 2 = 11-50, 3 = 51-200, 4 = 201-500, 5 = 501-1000, 6 = 1001-5000, 7 = 5001-10000, 8 = 10000+.",
    },
    { key: "owner", label: "Owner", type: "string", hint: "Username (email) of the owning user." },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: 'JSON array, e.g. [{"email":"team@example.com"}].',
    },
    {
      key: "phones",
      label: "Phones",
      type: "json",
      hint: 'JSON array, e.g. [{"phone":"950 23 50 37"}].',
    },
    {
      key: "websites",
      label: "Websites",
      type: "json",
      hint: 'JSON array, e.g. [{"website":"https://example.com"}].',
    },
    {
      key: "addresses",
      label: "Addresses",
      type: "json",
      hint: "JSON array of address objects (street, city, state, country, postal_code, type).",
    },
    {
      key: "extra",
      label: "Extra fields",
      type: "json",
      hint:
        "Further body fields as a JSON object (anything the Clientify API accepts that is not listed above, e.g. custom_fields). Named parameters win on a clash.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "name", type: "string", label: "Company name" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/companies/`, {
      method: "POST",
      body: compact({
        ...asObject(input.extra, "extra"),
        name: input.name,
        business_name: input.businessName,
        company_sector: input.companySector,
        taxpayer_identification_number: input.taxpayerIdentificationNumber,
        number_of_employees: input.numberOfEmployees,
        owner: input.owner,
        emails: asJson(input.emails),
        phones: asJson(input.phones),
        websites: asJson(input.websites),
        addresses: asJson(input.addresses),
      }),
    });
  },
};

export default companyCreate;
