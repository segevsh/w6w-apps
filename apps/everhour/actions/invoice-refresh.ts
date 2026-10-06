import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toList } from "../lib/client.ts";

/**
 * `POST /invoices/{invoiceId}/reset-time` — Rebuild an invoice's line items from the current tracked time and expenses.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  invoiceId: number;
  limitDateFrom?: string;
  limitDateTill?: string;
  includeExpenses?: boolean;
  includeTime?: boolean;
  projects?: string[] | string;
  expenseMask?: string;
  timeMask?: string;
}

const invoiceRefresh: ActionDefinition<Input> = {
  key: "invoice-refresh",
  type: "perform",
  resource: "invoice",
  title: "Refresh Invoice Line Items",
  description: "Rebuild an invoice's line items from the current tracked time and expenses.",
  idempotent: true,
  params: [
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "number",
      required: true,
      hint: "Numeric invoice id (from List Invoices).",
    },
    {
      key: "limitDateFrom",
      label: "Time from",
      type: "date",
      hint: "Include time and expenses from this date.",
    },
    {
      key: "limitDateTill",
      label: "Time until",
      type: "date",
      hint: "Include time and expenses up to this date.",
    },
    { key: "includeExpenses", label: "Include expenses", type: "boolean" },
    { key: "includeTime", label: "Include time", type: "boolean" },
    {
      key: "projects",
      label: "Project IDs",
      type: "string",
      hint: "Comma-separated project ids to bill, e.g. `gh:63301595`.",
    },
    {
      key: "expenseMask",
      label: "Expense line mask",
      type: "string",
      hint: "e.g. `%PROJECT% :: %CATEGORY%`.",
    },
    { key: "timeMask", label: "Time line mask", type: "string", hint: "e.g. `%PROJECT%`." },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "status", type: "string", label: "draft, sent or paid" },
    { key: "totalAmount", type: "number", label: "Total in cents" },
    { key: "invoiceItems", type: "array", label: "Line items" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/invoices/${encodeId(input.invoiceId)}/reset-time`, {
      method: "POST",
      body: compact({
        limitDateFrom: input.limitDateFrom,
        limitDateTill: input.limitDateTill,
        includeExpenses: input.includeExpenses,
        includeTime: input.includeTime,
        projects: toList(input.projects),
        expenseMask: input.expenseMask,
        timeMask: input.timeMask,
      }),
    });
  },
};

export default invoiceRefresh;
