import type { ActionDefinition } from "@w6w/types";
import { AnchorClient } from "../lib/client.ts";
import { limitParam, pageParam, searchParam } from "../lib/params.ts";

/** `GET /invoices` — Anchor operation `listInvoices`. */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  relationshipId?: string;
  issuedOnSince?: string;
  issuedOnUntil?: string;
  qboIntegration?: string;
  xeroIntegration?: string;
  sortField?: string;
  sortDirection?: string;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description:
    "Page through invoices issued by your business, with filters for status, dates and accounting sync.",
  params: [
    pageParam,
    limitParam,
    searchParam,
    {
      key: "status",
      label: "Status",
      type: "string",
      hint:
        "Comma-separated display statuses: issued, pending, overdue, processing, paid, refundFailed, refunded, partiallyRefunded, voided, disputed.",
    },
    {
      key: "relationshipId",
      label: "Agreement ID",
      type: "string",
      hint: "Only invoices under this agreement (relationship).",
    },
    { key: "issuedOnSince", label: "Issued since", type: "string", hint: "yyyy-MM-dd, inclusive." },
    { key: "issuedOnUntil", label: "Issued until", type: "string", hint: "yyyy-MM-dd, inclusive." },
    {
      key: "qboIntegration",
      label: "QuickBooks sync",
      type: "select",
      options: [{ value: "synced", label: "synced" }, { value: "notSynced", label: "notSynced" }],
      hint: "Filter by QuickBooks sync state.",
    },
    {
      key: "xeroIntegration",
      label: "Xero sync",
      type: "select",
      options: [{ value: "synced", label: "synced" }, { value: "notSynced", label: "notSynced" }],
      hint: "Filter by Xero sync state.",
    },
    {
      key: "sortField",
      label: "Sort field",
      type: "select",
      options: [
        { value: "number", label: "number" },
        { value: "companyName", label: "companyName" },
        { value: "displayStatus", label: "displayStatus" },
        { value: "issuedOn", label: "issuedOn" },
        { value: "dueDate", label: "dueDate" },
        { value: "totalAmount", label: "totalAmount" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [{ value: "asc", label: "asc" }, { value: "desc", label: "desc" }],
    },
  ],
  output: [
    { key: "entries", type: "array", label: "Items on this page" },
    { key: "page", type: "number", label: "Page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "totalCount", type: "number", label: "Total matching items" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", "/invoices", {
      query: {
        page: input.page,
        limit: input.limit,
        search: input.search,
        status: input.status,
        relationshipId: input.relationshipId,
        issuedOnSince: input.issuedOnSince,
        issuedOnUntil: input.issuedOnUntil,
        qboIntegration: input.qboIntegration,
        xeroIntegration: input.xeroIntegration,
        sortField: input.sortField,
        sortDirection: input.sortDirection,
      },
    });
  },
};

export default invoiceList;
