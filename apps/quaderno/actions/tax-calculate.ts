import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  toCountry: string;
  toPostalCode?: string;
  toCity?: string;
  toStreet?: string;
  fromCountry?: string;
  fromPostalCode?: string;
  taxId?: string;
  taxCode?: string;
  taxBehavior?: string;
  productType?: string;
  date?: string;
  amount?: string;
  currency?: string;
}

const taxCalculate: ActionDefinition<Input> = {
  key: "tax-calculate",
  type: "read",
  resource: "tax",
  title: "Calculate Tax",
  description: "Calculate the tax rate and amount for a sale to a given location.",
  params: [
    {
      key: "toCountry",
      label: "Customer country",
      type: "string",
      required: true,
      hint: "2-letter ISO country code.",
    },
    {
      key: "toPostalCode",
      label: "Customer postal code",
      type: "string",
      hint: "Required for some jurisdictions (e.g. US).",
    },
    { key: "toCity", label: "Customer city", type: "string" },
    { key: "toStreet", label: "Customer street", type: "string" },
    { key: "fromCountry", label: "Seller country", type: "string" },
    { key: "fromPostalCode", label: "Seller postal code", type: "string" },
    { key: "taxId", label: "Customer tax ID", type: "string" },
    {
      key: "taxCode",
      label: "Tax code",
      type: "select",
      options: [
        { "value": "consulting", "label": "consulting" },
        { "value": "eservice", "label": "eservice" },
        { "value": "ebook", "label": "ebook" },
        { "value": "saas", "label": "saas" },
        { "value": "standard", "label": "standard" },
        { "value": "reduced", "label": "reduced" },
        { "value": "exempt", "label": "exempt" },
      ],
    },
    {
      key: "taxBehavior",
      label: "Tax behavior",
      type: "select",
      options: [{ "value": "inclusive", "label": "Inclusive" }, {
        "value": "exclusive",
        "label": "Exclusive",
      }],
    },
    {
      key: "productType",
      label: "Product type",
      type: "select",
      options: [{ "value": "good", "label": "Good" }, { "value": "service", "label": "Service" }],
    },
    { key: "date", label: "Date", type: "string", hint: "YYYY-MM-DD. Defaults to today." },
    {
      key: "amount",
      label: "Amount",
      type: "string",
      hint: "Used to compute `tax_amount` and `total_amount`.",
    },
    { key: "currency", label: "Currency", type: "string" },
  ],
  output: [
    { key: "name", type: "string", label: "Tax name" },
    { key: "rate", type: "number", label: "Rate" },
    { key: "tax_amount", type: "number", label: "Tax amount" },
    { key: "total_amount", type: "number", label: "Total" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request("/tax_rates/calculate", {
      query: {
        to_country: input.toCountry,
        to_postal_code: input.toPostalCode,
        to_city: input.toCity,
        to_street: input.toStreet,
        from_country: input.fromCountry,
        from_postal_code: input.fromPostalCode,
        tax_id: input.taxId,
        tax_code: input.taxCode,
        tax_behavior: input.taxBehavior,
        product_type: input.productType,
        date: input.date,
        amount: input.amount,
        currency: input.currency,
      },
    });
  },
};

export default taxCalculate;
