import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList, toList } from "../lib/client.ts";
import {
  companyIdParam,
  invoiceStatusOptions,
  listOutput,
  paginationParams,
  paymentMethodOptions,
  sortDirectionParam,
} from "../lib/params.ts";

/**
 * `GET /invoices` — the invoice list, with the richest filter set in the API.
 *
 * Four independent date ranges (`created_at`, `due_at`, `paid_at`) and an
 * amount-due range, all of which combine. Amounts are integers in cents, so
 * `amount_due_min=1` means "anything with a balance".
 *
 * `customer_uuid` is an array despite the singular name — that is the
 * reference's own schema, not a typo here.
 */
interface Input {
  status?: string[] | string;
  customerUuid?: string[] | string;
  paymentMethod?: string[] | string;
  createdAtMin?: string;
  createdAtMax?: string;
  dueAtMin?: string;
  dueAtMax?: string;
  paidAtMin?: string;
  paidAtMax?: string;
  amountDueMin?: number;
  amountDueMax?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  companyId?: string;
}

const invoiceList: ActionDefinition<Input, NormalizedList> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "Find Invoices",
  description:
    "List invoices, filtered by status, customer, payment method, created/due/paid dates or " +
    "outstanding amount. Amounts are integers in cents.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: invoiceStatusOptions,
    },
    {
      key: "customerUuid",
      label: "Customer UUIDs",
      type: "string",
      hint: "Comma-separated customer ids.",
    },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "multiselect",
      options: paymentMethodOptions,
    },
    { key: "createdAtMin", label: "Created from", type: "datetime" },
    { key: "createdAtMax", label: "Created to", type: "datetime" },
    { key: "dueAtMin", label: "Due from", type: "datetime" },
    { key: "dueAtMax", label: "Due to", type: "datetime" },
    { key: "paidAtMin", label: "Paid from", type: "datetime" },
    { key: "paidAtMax", label: "Paid to", type: "datetime" },
    {
      key: "amountDueMin",
      label: "Amount due at least (cents)",
      type: "number",
      hint: "In cents. 1 finds every invoice with any balance outstanding.",
    },
    { key: "amountDueMax", label: "Amount due at most (cents)", type: "number" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created_at",
      options: [
        { value: "created_at", label: "Created at (default)" },
        { value: "updated_at", label: "Updated at" },
        { value: "amount", label: "Amount" },
        { value: "due_amount", label: "Due amount" },
        { value: "due_at", label: "Due at" },
        { value: "invoice_number", label: "Invoice number" },
        { value: "paid_at", label: "Paid at" },
        { value: "sent_at", label: "Sent at" },
        { value: "status", label: "Status" },
      ],
    },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Invoices"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/invoices", "invoices", {
      companyId: input.companyId,
      query: {
        status: toList(input.status),
        customer_uuid: toList(input.customerUuid),
        payment_method: toList(input.paymentMethod),
        created_at_min: input.createdAtMin,
        created_at_max: input.createdAtMax,
        due_at_min: input.dueAtMin,
        due_at_max: input.dueAtMax,
        paid_at_min: input.paidAtMin,
        paid_at_max: input.paidAtMax,
        amount_due_min: input.amountDueMin,
        amount_due_max: input.amountDueMax,
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default invoiceList;
