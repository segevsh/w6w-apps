import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient, toObject } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Create a company (`POST /companies`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  name: string;
  billingName?: string;
  vat?: string;
  domain?: string;
  defaultCurrency?: string;
  dueDays?: number;
  paymentTermsType?: string | number;
  companyCode?: string;
  parentCompanyId?: number;
  contact?: unknown;
  tagList?: string;
  customFields?: unknown;
}

const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Create a company (`POST /companies`).",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    { "key": "billingName", "label": "Billing name", "type": "string" },
    { "key": "vat", "label": "VAT number", "type": "string" },
    { "key": "domain", "label": "Domain", "type": "string" },
    {
      "key": "defaultCurrency",
      "label": "Default currency",
      "type": "string",
      "hint": "ISO currency code, e.g. `EUR`.",
    },
    { "key": "dueDays", "label": "Payment due days", "type": "number" },
    {
      "key": "paymentTermsType",
      "label": "Payment terms",
      "type": "select",
      "options": [{ "value": "days_after_invoice_date", "label": "Days after invoice date" }, {
        "value": "end_of_month",
        "label": "End of month",
      }, { "value": "due_upon_receipt", "label": "Due upon receipt" }],
    },
    { "key": "companyCode", "label": "Company code", "type": "string" },
    { "key": "parentCompanyId", "label": "Parent company ID", "type": "number" },
    {
      "key": "contact",
      "label": "Contact",
      "type": "json",
      "hint":
        'JSON object of the primary contact (name, email, phone), e.g. `{"email": "a@b.com"}`.',
    },
    { "key": "tagList", "label": "Tags", "type": "string", "hint": "Tags as one string." },
    {
      "key": "customFields",
      "label": "Custom fields",
      "type": "json",
      "hint": "JSON object of custom field values, keyed by custom field id.",
    },
  ],
  output: resourceOutput("Company"),

  async execute(input, ctx) {
    const attrs = {
      "name": input.name,
      "billing_name": input.billingName,
      "vat": input.vat,
      "domain": input.domain,
      "default_currency": input.defaultCurrency,
      "due_days": input.dueDays,
      "payment_terms_type": input.paymentTermsType,
      "company_code": input.companyCode,
      "parent_company_id": input.parentCompanyId,
      "contact": toObject(input.contact, "contact"),
      "tag_list": input.tagList,
      "custom_fields": toObject(input.customFields, "custom fields"),
    };
    return await new ProductiveClient(ctx).one(`/companies`, {
      method: "POST",
      body: jsonApiBody("companies", attrs),
    });
  },
};

export default companyCreate;
