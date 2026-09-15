import type { ActionDefinition } from "@w6w/types";
import { compact, MocoClient } from "../lib/client.ts";
import { customProperties, parseList } from "../lib/params.ts";

interface Input {
  type: "customer" | "supplier" | "organization";
  name: string;
  identifier?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  countryCode?: string;
  currency?: string;
  vatIdentifier?: string;
  info?: string;
  invoiceDueDays?: number;
  tags?: string[] | string;
  customProperties?: unknown;
}

/** `POST /companies` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. */
const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Create a customer, supplier or organization.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, row: "identity" },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "customer",
      row: "identity",
      options: [
        { value: "customer", label: "Customer" },
        { value: "supplier", label: "Supplier" },
        { value: "organization", label: "Organization" },
      ],
    },
    { key: "identifier", label: "Identifier", type: "string", hint: "e.g. C-1001" },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    { key: "website", label: "Website", type: "string", advanced: true },
    { key: "address", label: "Address", type: "text", advanced: true },
    { key: "countryCode", label: "Country code", type: "string", advanced: true, hint: "e.g. CH" },
    { key: "currency", label: "Currency", type: "string", advanced: true, hint: "e.g. CHF" },
    { key: "vatIdentifier", label: "VAT identifier", type: "string", advanced: true },
    { key: "invoiceDueDays", label: "Default invoice due days", type: "number", advanced: true },
    { key: "info", label: "Notes", type: "text", advanced: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated list of tag names.",
    },
    {
      key: "customProperties",
      label: "Custom properties",
      type: "json",
      advanced: true,
      hint: '{ "CRM_ID": "SF-4552" }',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request("/companies", {
      method: "POST",
      body: compact({
        type: input.type,
        name: input.name,
        identifier: input.identifier,
        email: input.email,
        phone: input.phone,
        website: input.website,
        address: input.address,
        country_code: input.countryCode,
        currency: input.currency,
        vat_identifier: input.vatIdentifier,
        default_invoice_due_days: input.invoiceDueDays,
        info: input.info,
        tags: parseList(input.tags),
        custom_properties: customProperties(input.customProperties),
      }),
    });
  },
};

export default companyCreate;
