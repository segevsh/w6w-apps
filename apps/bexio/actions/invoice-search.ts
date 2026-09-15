import type { ActionDefinition } from "@w6w/types";
import { BexioClient, listQuery, type SearchCriterion } from "../lib/client.ts";

interface Input {
  field: string;
  value: string;
  criteria?: SearchCriterion["criteria"];
  orderBy?: "id" | "total" | "total_net" | "total_gross" | "updated_at";
  descending?: boolean;
  limit?: number;
  offset?: number;
}

const invoiceSearch: ActionDefinition<Input> = {
  key: "invoice-search",
  type: "search",
  resource: "invoice",
  title: "Search Invoices",
  description: "Search invoices by a single field/value/criteria triple.",
  params: [
    {
      key: "field",
      label: "Field",
      type: "string",
      required: true,
      hint: 'e.g. "document_nr", "contact_id", "kb_item_status_id".',
    },
    { key: "value", label: "Value", type: "string", required: true },
    {
      key: "criteria",
      label: "Criteria",
      type: "select",
      default: "like",
      options: [
        { value: "=", label: "Equals" },
        { value: "!=", label: "Not equals" },
        { value: ">", label: "Greater than" },
        { value: "<", label: "Less than" },
        { value: "like", label: "Contains (partial match)" },
        { value: "in", label: "In list" },
      ],
    },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "total", label: "Total" },
        { value: "total_net", label: "Total (net)" },
        { value: "total_gross", label: "Total (gross)" },
        { value: "updated_at", label: "Last updated" },
      ],
    },
    { key: "descending", label: "Descending", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "document_nr", type: "string", label: "Invoice number" },
  ],

  execute(input, ctx) {
    const criteria: SearchCriterion[] = [
      { field: input.field, value: input.value, criteria: input.criteria },
    ];
    return new BexioClient(ctx).search("/2.0/kb_invoice/search", criteria, listQuery(input));
  },
};

export default invoiceSearch;
