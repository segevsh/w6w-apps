import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { compact } from "../lib/params.ts";

/**
 * `POST /products` — create a catalogue product.
 *
 * Required: `label`, `price_before_tax` and `vat_rate`. The price is a
 * **string decimal** (`"100.00"`) on purpose — the vendor's pattern is
 * `^-?\d+(\.\d+)?$` and sending a JSON number is a documented 400 ("amounts not
 * sent as strings").
 *
 * `vat_rate` is Pennylane's rate code, not a percentage: `FR_200` is 20%, and
 * the full enum covers every supported country's rates (it runs to ~160
 * entries, so it is collected as free text here rather than as a select that
 * would silently omit a valid code).
 *
 * `substance` decides which of the company's two revenue ledger accounts the
 * product's revenue posts to; when it is given together with
 * `ledger_account_id` the two must agree or the vendor answers 422.
 */
interface Input {
  label: string;
  price_before_tax: string;
  vat_rate: string;
  description?: string;
  external_reference?: string;
  unit?: string;
  currency?: string;
  reference?: string;
  ledger_account_id?: number;
  substance?: string;
  custom_fields?: unknown;
}

const createProduct: ActionDefinition<Input> = {
  key: "create-product",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description:
    "Create a product with its pre-tax price, VAT rate and optional unit, currency, ledger " +
    "account and revenue substance (POST /products).",
  idempotent: false,
  params: [
    { key: "label", label: "Label", type: "string", required: true },
    {
      key: "price_before_tax",
      label: "Price before tax",
      type: "string",
      required: true,
      placeholder: "100.00",
      hint: "A string decimal, not a number — e.g. `100.00`. A JSON number is a 400.",
    },
    {
      key: "vat_rate",
      label: "VAT rate code",
      type: "string",
      required: true,
      placeholder: "FR_200",
      hint: "Pennylane's rate code: `FR_200` is 20%, `FR_100` 10%, `FR_55` 5.5%, `FR_21` 2.1%, " +
        "`FR_09` 0.9%, `exempt` for exempt. Other countries use the same `<ISO>_<rate>` form.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Maximum 5,000 characters.",
    },
    {
      key: "external_reference",
      label: "External reference",
      type: "string",
      hint: "Your own unique id for this product. Pennylane generates one when omitted.",
    },
    { key: "unit", label: "Unit", type: "string", placeholder: "piece", advanced: true },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      advanced: true,
      placeholder: "EUR",
      hint: "ISO 4217 code, e.g. EUR, USD, GBP, CHF. Defaults to the company currency.",
    },
    { key: "reference", label: "Reference", type: "string", advanced: true },
    {
      key: "ledger_account_id",
      label: "Ledger account ID",
      type: "number",
      advanced: true,
      hint: "The `id` from List Ledger Accounts.",
    },
    {
      key: "substance",
      label: "Substance",
      type: "select",
      advanced: true,
      options: [
        { value: "goods", label: "Goods" },
        { value: "services", label: "Services" },
      ],
      hint:
        "Resolves the product's ledger account, and must agree with Ledger account ID if both are set.",
    },
    {
      key: "custom_fields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Array of `{ "name": "color", "value": "red" }`.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "label", type: "string", label: "Label" },
    { key: "price_before_tax", type: "string", label: "Price before tax" },
    { key: "vat_rate", type: "string", label: "VAT rate code" },
    { key: "external_reference", type: "string", label: "External reference" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request("/products", {
      method: "POST",
      body: compact(input),
    });
  },
};

export default createProduct;
