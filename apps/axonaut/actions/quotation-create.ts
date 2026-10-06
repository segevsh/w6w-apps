import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, toArray } from "../lib/client.ts";

/**
 * `POST /api/v2/quotations` — Create a quotation with its product lines.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  company_id?: number;
  company_address_id?: number;
  business_manager?: string;
  project_id?: number;
  opportunity_id?: number;
  theme_id?: number;
  comments?: string;
  mandatory_mentions?: string;
  payment_terms?: string;
  date?: string;
  expiry_date?: string;
  global_discount_amount?: number;
  global_discount_unit_is_percent?: boolean;
  global_discount_comments?: string;
  products?: string | Record<string, unknown> | unknown[];
}

const quotationCreate: ActionDefinition<Input> = {
  key: "quotation-create",
  type: "perform",
  resource: "quotation",
  title: "Create Quotation",
  description: "Create a quotation with its product lines.",
  idempotent: false,
  params: [
    { key: "company_id", label: "Company ID", type: "number", hint: "Company id." },
    { key: "company_address_id", label: "Company address ID", type: "number", hint: "Address id." },
    { key: "business_manager", label: "Business manager", type: "string", hint: "Manager email." },
    { key: "project_id", label: "Project ID", type: "number", hint: "Project id." },
    { key: "opportunity_id", label: "Opportunity ID", type: "number", hint: "Opportunity id." },
    { key: "theme_id", label: "Theme ID", type: "number", hint: "Document theme id." },
    { key: "comments", label: "Comments", type: "text", hint: "Comments." },
    {
      key: "mandatory_mentions",
      label: "Mandatory mentions",
      type: "text",
      hint: "Legal mentions.",
    },
    { key: "payment_terms", label: "Payment terms", type: "text", hint: "Payment terms." },
    {
      key: "date",
      label: "Date",
      type: "string",
      hint: "ISO 8601 date, e.g. `2026-10-06T09:00:00+02:00`.",
    },
    {
      key: "expiry_date",
      label: "Expiry date",
      type: "string",
      hint: "ISO 8601 date, e.g. `2026-10-06T09:00:00+02:00`.",
    },
    {
      key: "global_discount_amount",
      label: "Global discount",
      type: "number",
      hint: "Discount amount.",
    },
    {
      key: "global_discount_unit_is_percent",
      label: "Discount is percent",
      type: "boolean",
      hint: "Whether the global discount is a percent rather than flat.",
    },
    {
      key: "global_discount_comments",
      label: "Discount comments",
      type: "string",
      hint: "Discount note.",
    },
    {
      key: "products",
      label: "Products",
      type: "json",
      hint:
        "JSON array of lines `{id | internal_id | product_code | name, price, tax_rate, quantity, unit, description, chapter, discount_percent, discount_flat, unit_job_costing}`.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Quotation ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "company_id", type: "number", label: "Company ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "expiry_date", type: "string", label: "Expiry date" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/quotations`, {
      method: "POST",
      body: compact({
        "company_id": input.company_id,
        "company_address_id": input.company_address_id,
        "business_manager": input.business_manager,
        "project_id": input.project_id,
        "opportunity_id": input.opportunity_id,
        "theme_id": input.theme_id,
        "comments": input.comments,
        "mandatory_mentions": input.mandatory_mentions,
        "payment_terms": input.payment_terms,
        "date": input.date,
        "expiry_date": input.expiry_date,
        "global_discount_amount": input.global_discount_amount,
        "global_discount_unit_is_percent": input.global_discount_unit_is_percent,
        "global_discount_comments": input.global_discount_comments,
        "products": toArray(input.products, "products"),
      }),
    });
  },
};

export default quotationCreate;
