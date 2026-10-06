import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, toArray, toObject } from "../lib/client.ts";

/**
 * `POST /api/v2/invoices` — Create an invoice from an order (contract), with its product lines.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  contract_id: number;
  company_id?: number;
  employee_email?: string;
  company_address_id?: number;
  project_id?: number;
  date?: string;
  due_date?: string;
  service_start_date?: string;
  service_end_date?: string;
  business_manager?: string;
  order_number?: string;
  global_discount_flat?: number;
  global_discount_percent?: number;
  global_discount_comments?: string;
  deposit_type?: string;
  deposit_percent?: number;
  deposit_flat?: number;
  mandatory_mentions?: string;
  payment_terms?: string;
  theme_id?: number;
  products?: string | Record<string, unknown> | unknown[];
  delivery_address?: string | Record<string, unknown> | unknown[];
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description: "Create an invoice from an order (contract), with its product lines.",
  idempotent: false,
  params: [
    {
      key: "contract_id",
      label: "Order ID",
      type: "number",
      required: true,
      hint: "Order (contract) the invoice bills.",
    },
    { key: "company_id", label: "Company ID", type: "number", hint: "Company id." },
    {
      key: "employee_email",
      label: "Employee email",
      type: "string",
      hint: "Billing contact email.",
    },
    {
      key: "company_address_id",
      label: "Company address ID",
      type: "number",
      hint: "Billing address id.",
    },
    { key: "project_id", label: "Project ID", type: "number", hint: "Project id." },
    {
      key: "date",
      label: "Date",
      type: "string",
      hint: "Invoice date. ISO 8601 date, e.g. `2026-10-06T09:00:00+02:00`.",
    },
    {
      key: "due_date",
      label: "Due date",
      type: "string",
      hint: "ISO 8601 date, e.g. `2026-10-06T09:00:00+02:00`.",
    },
    {
      key: "service_start_date",
      label: "Service start",
      type: "string",
      hint: "ISO 8601 date, e.g. `2026-10-06T09:00:00+02:00`.",
    },
    {
      key: "service_end_date",
      label: "Service end",
      type: "string",
      hint: "ISO 8601 date, e.g. `2026-10-06T09:00:00+02:00`.",
    },
    { key: "business_manager", label: "Business manager", type: "string", hint: "Manager email." },
    { key: "order_number", label: "Order number", type: "string", hint: "Customer order number." },
    {
      key: "global_discount_flat",
      label: "Global discount (flat)",
      type: "number",
      hint: "Flat discount.",
    },
    {
      key: "global_discount_percent",
      label: "Global discount (%)",
      type: "number",
      hint: "Percent discount.",
    },
    {
      key: "global_discount_comments",
      label: "Discount comments",
      type: "string",
      hint: "Discount note.",
    },
    {
      key: "deposit_type",
      label: "Deposit type",
      type: "select",
      options: [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }],
      hint: "1, 2 or 3, as defined by Axonaut.",
    },
    { key: "deposit_percent", label: "Deposit (%)", type: "number", hint: "Deposit percent." },
    { key: "deposit_flat", label: "Deposit (flat)", type: "number", hint: "Deposit amount." },
    {
      key: "mandatory_mentions",
      label: "Mandatory mentions",
      type: "text",
      hint: "Legal mentions.",
    },
    { key: "payment_terms", label: "Payment terms", type: "text", hint: "Payment terms." },
    { key: "theme_id", label: "Theme ID", type: "number", hint: "Document theme id (see themes)." },
    {
      key: "products",
      label: "Products",
      type: "json",
      hint:
        "JSON array of lines `{id | internal_id | product_code | name, price, tax_rate, quantity, unit, description, chapter, discount_percent, discount_flat, unit_job_costing}`.",
    },
    {
      key: "delivery_address",
      label: "Delivery address",
      type: "json",
      hint: "JSON object `{company_name, contact_name, street, zip_code, city, region, country}`.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "number", type: "string", label: "Invoice number" },
    { key: "date", type: "string", label: "Date" },
    { key: "due_date", type: "string", label: "Due date" },
    { key: "total", type: "number", label: "Total" },
    { key: "paid_date", type: "string", label: "Paid date" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/invoices`, {
      method: "POST",
      body: compact({
        "contract_id": input.contract_id,
        "company_id": input.company_id,
        "employee_email": input.employee_email,
        "company_address_id": input.company_address_id,
        "project_id": input.project_id,
        "date": input.date,
        "due_date": input.due_date,
        "service_start_date": input.service_start_date,
        "service_end_date": input.service_end_date,
        "business_manager": input.business_manager,
        "order_number": input.order_number,
        "global_discount_flat": input.global_discount_flat,
        "global_discount_percent": input.global_discount_percent,
        "global_discount_comments": input.global_discount_comments,
        "deposit_type": input.deposit_type === undefined ? undefined : Number(input.deposit_type),
        "deposit_percent": input.deposit_percent,
        "deposit_flat": input.deposit_flat,
        "mandatory_mentions": input.mandatory_mentions,
        "payment_terms": input.payment_terms,
        "theme_id": input.theme_id,
        "products": toArray(input.products, "products"),
        "delivery_address": toObject(input.delivery_address, "delivery_address"),
      }),
    });
  },
};

export default invoiceCreate;
