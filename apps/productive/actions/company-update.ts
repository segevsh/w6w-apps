import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonApiBody, ProductiveClient, requireAny, toObject } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Change a company (`PATCH /companies/{id}`). Only the fields you set are sent.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  name?: string;
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

const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description: "Change a company (`PATCH /companies/{id}`). Only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Company ID", type: "string", required: true },
    { "key": "name", "label": "Name", "type": "string" },
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
    requireAny(attrs, "company");
    return await new ProductiveClient(ctx).one(`/companies/${encodeId(input.id)}`, {
      method: "PATCH",
      body: jsonApiBody("companies", attrs),
    });
  },
};

export default companyUpdate;
