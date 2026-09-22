import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { addressParam, compact, emailsParam, ledgerAccountParam } from "../lib/params.ts";

/**
 * `POST /suppliers` — create a supplier.
 *
 * `name` is the only required field. The two French identifiers are optional
 * because a non-French supplier has neither: `establishment_no` is the
 * 14-digit SIRET and `reg_no` the 9-digit SIREN, and the vendor documents
 * SIRET as French-only.
 *
 * `supplier_payment_method` and the due-date pair (`supplier_due_date_rule` of
 * `days` or `days_or_end_of_month`, plus `supplier_due_date_delay` in days)
 * describe how this supplier is paid — the fields a payment run reads.
 */
interface Input {
  name: string;
  establishment_no?: string;
  reg_no?: string;
  postal_address?: Record<string, unknown>;
  vat_number?: string;
  ledger_account?: Record<string, unknown>;
  emails?: string[];
  iban?: string;
  supplier_payment_method?: string;
  supplier_due_date_delay?: number;
  supplier_due_date_rule?: string;
  external_reference?: string;
}

const createSupplier: ActionDefinition<Input> = {
  key: "create-supplier",
  type: "perform",
  resource: "supplier",
  title: "Create Supplier",
  description:
    "Create a supplier with optional business identifiers, address, IBAN and payment terms " +
    "(POST /suppliers).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "establishment_no",
      label: "Establishment number (SIRET)",
      type: "string",
      placeholder: "12345678900012",
      hint: "14 digits. French establishments only.",
    },
    {
      key: "reg_no",
      label: "Registration number (SIREN)",
      type: "string",
      placeholder: "123456789",
    },
    addressParam("postal_address", "Postal address"),
    { key: "vat_number", label: "VAT number", type: "string", placeholder: "FR12345678901" },
    ledgerAccountParam(),
    { ...emailsParam(), advanced: true },
    { key: "iban", label: "IBAN", type: "string" },
    {
      key: "supplier_payment_method",
      label: "Payment method",
      type: "select",
      options: [
        { value: "automatic_transfer", label: "Automatic transfer" },
        { value: "manual_transfer", label: "Manual transfer" },
        { value: "automatic_debiting", label: "Automatic debiting" },
        { value: "bill_of_exchange", label: "Bill of exchange" },
        { value: "check", label: "Check" },
        { value: "cash", label: "Cash" },
        { value: "card", label: "Card" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "supplier_due_date_delay",
      label: "Due-date delay (days)",
      type: "number",
      hint: "Paired with the due-date rule.",
    },
    {
      key: "supplier_due_date_rule",
      label: "Due-date rule",
      type: "select",
      options: [
        { value: "days", label: "Days" },
        { value: "days_or_end_of_month", label: "Days or end of month" },
      ],
    },
    {
      key: "external_reference",
      label: "External reference",
      type: "string",
      advanced: true,
      hint: "Your own unique id for this supplier. Pennylane generates one when omitted.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Supplier ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "reg_no", type: "string", label: "Registration number" },
    { key: "vat_number", type: "string", label: "VAT number" },
    { key: "postal_address", type: "object", label: "Postal address" },
    { key: "external_reference", type: "string", label: "External reference" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request("/suppliers", {
      method: "POST",
      body: compact(input),
    });
  },
};

export default createSupplier;
