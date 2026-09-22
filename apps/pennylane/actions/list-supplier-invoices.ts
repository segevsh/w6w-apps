import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /supplier_invoices` — list supplier invoices.
 *
 * Pennylane's filter fields here are `id`, `supplier_id`, `invoice_number`,
 * `date`, `category_id`, `external_reference`, `payment_status` and `flow_id`;
 * `sort` accepts `id` or `date`. Supplier invoices arrive either imported (with
 * a file attachment) or created through the API, and `import_source` on each
 * item says which.
 */
const listSupplierInvoices: ActionDefinition<ListInput> = {
  key: "list-supplier-invoices",
  type: "read",
  resource: "supplier-invoice",
  title: "List Supplier Invoices",
  description:
    "List supplier invoices, one cursor page at a time (GET /supplier_invoices). Filterable on " +
    "id, supplier_id, invoice_number, date, payment_status and more.",
  params: listParams(100),
  output: [
    { key: "items", type: "array", label: "Supplier invoices" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/supplier_invoices", {
      query: listQuery(input),
    });
  },
};

export default listSupplierInvoices;
