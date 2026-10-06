import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toList, toObject } from "../lib/client.ts";

/**
 * `POST /clients/{clientId}/invoices` — Create an invoice for a client from tracked time and expenses.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  clientId: number;
  limitDateFrom?: string;
  limitDateTill?: string;
  includeExpenses?: boolean;
  includeTime?: boolean;
  projects?: string[] | string;
  tax?: unknown;
  discount?: unknown;
}

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description: "Create an invoice for a client from tracked time and expenses.",
  idempotent: false,
  params: [
    {
      key: "clientId",
      label: "Client ID",
      type: "number",
      required: true,
      hint: "Numeric Everhour client id (from List Clients).",
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
    { key: "tax", label: "Tax", type: "json", hint: 'JSON object `{"rate": 11, "amount": 1512}`.' },
    {
      key: "discount",
      label: "Discount",
      type: "json",
      hint: 'JSON object `{"rate": 25, "amount": 4581}`.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "status", type: "string", label: "draft, sent or paid" },
    { key: "totalAmount", type: "number", label: "Total in cents" },
    { key: "invoiceItems", type: "array", label: "Line items" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/clients/${encodeId(input.clientId)}/invoices`, {
      method: "POST",
      body: compact({
        limitDateFrom: input.limitDateFrom,
        limitDateTill: input.limitDateTill,
        includeExpenses: input.includeExpenses,
        includeTime: input.includeTime,
        projects: toList(input.projects),
        tax: toObject(input.tax, "tax"),
        discount: toObject(input.discount, "discount"),
      }),
    });
  },
};

export default invoiceCreate;
