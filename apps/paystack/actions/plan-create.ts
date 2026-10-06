import type { ActionDefinition } from "@w6w/types";
import { compact, PaystackClient, requireAmount, required } from "../lib/client.ts";

/** `POST /plan`. */
interface Input {
  name: string;
  amount: number;
  interval: string;
  description?: string;
  sendInvoices?: boolean;
  sendSms?: boolean;
  currency?: string;
  invoiceLimit?: number;
}

const planCreate: ActionDefinition<Input> = {
  key: "plan-create",
  type: "perform",
  resource: "plan",
  title: "Create Plan",
  description: "Create a recurring-billing plan that customers can be subscribed to.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "amount",
      label: "Amount (smallest unit)",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "interval",
      label: "Interval",
      type: "select",
      required: true,
      options: ["daily", "weekly", "monthly", "biannually", "annually"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { key: "description", label: "Description", type: "string" },
    { key: "sendInvoices", label: "Send invoices", type: "boolean" },
    { key: "sendSms", label: "Send SMS", type: "boolean" },
    { key: "currency", label: "Currency", type: "string", hint: "e.g. NGN, GHS, ZAR, KES, USD." },
    {
      key: "invoiceLimit",
      label: "Invoice limit",
      type: "number",
      hint: "Number of times to charge; 0 or empty is unlimited.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "plan_code", type: "string", label: "Plan code" },
    { key: "name", type: "string", label: "Name" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "interval", type: "string", label: "Interval" },
  ],
  async execute(input, ctx) {
    return await new PaystackClient(ctx).data("/plan", {
      method: "POST",
      body: compact({
        name: required(input.name, "Name"),
        amount: requireAmount(input.amount),
        interval: required(input.interval, "Interval"),
        description: input.description,
        send_invoices: input.sendInvoices,
        send_sms: input.sendSms,
        currency: input.currency,
        invoice_limit: input.invoiceLimit,
      }),
    });
  },
};

export default planCreate;
