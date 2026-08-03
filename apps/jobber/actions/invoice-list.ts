import type { ActionDefinition } from "@w6w/types";
import {
  dateRange,
  INVOICE_FIELDS,
  JobberClient,
  optionalInput,
  PAGE_INFO,
  sortInput,
} from "../lib/client.ts";

interface Input {
  clientId?: string;
  status?: string;
  dueAfter?: string;
  dueBefore?: string;
  issuedAfter?: string;
  issuedBefore?: string;
  searchTerm?: string;
  sortKey?: string;
  sortDirection?: string;
  first?: number;
  after?: string;
}

const QUERY = `
  query ListInvoices(
    $filter: InvoiceFilterAttributes
    $searchTerm: String
    $sort: [InvoiceSortInput!]
    $first: Int
    $after: String
  ) {
    invoices(filter: $filter, searchTerm: $searchTerm, sort: $sort, first: $first, after: $after) {
      nodes { ${INVOICE_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

/**
 * `past_due` is a status Jobber computes, not a date comparison to run
 * client-side — which makes "chase the overdue invoices" a one-filter query
 * rather than a fetch-everything-and-sort.
 */
const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description:
    "List invoices with balances and status. Filter by client, status, or issue and due date windows.",
  params: [
    { key: "clientId", label: "Client ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "sent_not_due", label: "Sent, not yet due" },
        { value: "awaiting_payment", label: "Awaiting payment" },
        { value: "past_due", label: "Past due" },
        { value: "paid", label: "Paid" },
        { value: "bad_debt", label: "Bad debt" },
      ],
    },
    { key: "dueAfter", label: "Due after", type: "datetime", row: "due" },
    { key: "dueBefore", label: "Due before", type: "datetime", row: "due" },
    { key: "issuedAfter", label: "Issued after", type: "datetime", advanced: true, row: "iss" },
    { key: "issuedBefore", label: "Issued before", type: "datetime", advanced: true, row: "iss" },
    { key: "searchTerm", label: "Search", type: "string" },
    {
      key: "sortKey",
      label: "Sort by",
      type: "select",
      options: [
        { value: "CREATED_AT", label: "Created at" },
        { value: "UPDATED_AT", label: "Updated at" },
        { value: "DUE_DATE", label: "Due date" },
        { value: "ISSUED_DATE", label: "Issued date" },
        { value: "INVOICE_NUMBER", label: "Invoice number" },
        { value: "INVOICE_STATUS", label: "Status" },
        { value: "INVOICE_TOTAL", label: "Total" },
        { value: "INVOICE_BALANCE", label: "Balance" },
        { value: "CLIENT_PRIMARY_NAME", label: "Client primary name" },
      ],
      advanced: true,
      row: "sort",
    },
    {
      key: "sortDirection",
      label: "Direction",
      type: "select",
      default: "DESCENDING",
      options: [
        { value: "DESCENDING", label: "Descending" },
        { value: "ASCENDING", label: "Ascending" },
      ],
      advanced: true,
      row: "sort",
    },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "after", label: "Cursor", type: "string" },
  ],
  output: [{ key: "invoices", type: "object", label: "Page of invoices with pageInfo" }],

  execute(input, ctx) {
    const sort = sortInput(input.sortKey, input.sortDirection);
    return new JobberClient(ctx).query(QUERY, {
      filter: optionalInput({
        clientId: input.clientId,
        status: input.status,
        dueDate: dateRange(input.dueAfter, input.dueBefore),
        issuedDate: dateRange(input.issuedAfter, input.issuedBefore),
      }),
      searchTerm: input.searchTerm,
      sort: sort ? [sort] : undefined,
      first: input.first ?? 25,
      after: input.after,
    });
  },
};

export default invoiceList;
