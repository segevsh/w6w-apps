import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List invoices, filtered, sorted and paged (`GET /invoices`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  companyId?: number;
  dealId?: number;
  projectId?: number;
  number?: string;
  paymentStatus?: number;
  sentStatus?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices, filtered, sorted and paged (`GET /invoices`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    { "key": "companyId", "label": "Company ID", "type": "number" },
    { "key": "dealId", "label": "Deal / budget ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "number", "label": "Invoice number", "type": "string" },
    {
      "key": "paymentStatus",
      "label": "Payment status",
      "type": "number",
      "hint": "1, 2 or 3 (vendor enum; the reference does not label them).",
    },
    {
      "key": "sentStatus",
      "label": "Sent status",
      "type": "number",
      "hint": "1 or 2 (vendor enum; the reference does not label them).",
    },
    ...listParams(
      "`invoiced_on`, `-created_at`, `number`, `amount`, `pay_on`, `company_name`; prefix `-` for descending.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/invoices", {
      query: listQuery(input, {
        "query": input.query,
        "company_id": input.companyId,
        "deal_id": input.dealId,
        "project_id": input.projectId,
        "number": input.number,
        "payment_status": input.paymentStatus,
        "sent_status": input.sentStatus,
      }),
    });
    return items;
  },
};

export default invoiceList;
