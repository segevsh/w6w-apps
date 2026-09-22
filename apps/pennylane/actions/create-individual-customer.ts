import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { addressParam, compact, emailsParam, ledgerAccountParam } from "../lib/params.ts";

/**
 * `POST /individual_customers` — create an individual (non-company) customer.
 *
 * A different endpoint from `POST /company_customers`, not a flag: the vendor
 * splits the two resource types, and an individual takes
 * `first_name`/`last_name` where a company takes `name`. The optional set is
 * then identical — address pair, emails, ledger account, payment conditions,
 * billing language — and `billing_address` is required the same way.
 */
interface Input {
  first_name: string;
  last_name: string;
  billing_address: Record<string, unknown>;
  phone?: string;
  delivery_address?: Record<string, unknown>;
  payment_conditions?: string;
  billing_iban?: string;
  recipient?: string;
  reference?: string;
  ledger_account?: Record<string, unknown>;
  notes?: string;
  emails?: string[];
  external_reference?: string;
  billing_language?: string;
}

const createIndividualCustomer: ActionDefinition<Input> = {
  key: "create-individual-customer",
  type: "perform",
  resource: "customer",
  title: "Create Individual Customer",
  description:
    "Create an individual customer with a billing address and optional contact, ledger and " +
    "payment settings (POST /individual_customers).",
  idempotent: false,
  params: [
    { key: "first_name", label: "First name", type: "string", required: true },
    { key: "last_name", label: "Last name", type: "string", required: true },
    addressParam("billing_address", "Billing address", true),
    { key: "phone", label: "Phone", type: "string" },
    addressParam("delivery_address", "Delivery address"),
    {
      key: "payment_conditions",
      label: "Payment conditions",
      type: "select",
      hint: "Defaults to 30_days at the vendor.",
      options: [
        "upon_receipt",
        "custom",
        "7_days",
        "15_days",
        "30_days",
        "30_days_end_of_month",
        "45_days",
        "45_days_end_of_month",
        "60_days",
      ].map((value) => ({ value, label: value })),
    },
    { key: "billing_iban", label: "Billing IBAN", type: "string" },
    {
      key: "recipient",
      label: "Recipient",
      type: "string",
      hint: "Who the invoice is addressed to.",
    },
    { key: "reference", label: "Reference", type: "string", advanced: true },
    ledgerAccountParam(),
    { key: "notes", label: "Notes", type: "text", advanced: true },
    { ...emailsParam(), advanced: true },
    {
      key: "external_reference",
      label: "External reference",
      type: "string",
      advanced: true,
      hint: "Your own unique id for this customer. Pennylane generates one when omitted.",
    },
    {
      key: "billing_language",
      label: "Billing language",
      type: "select",
      advanced: true,
      options: [
        { value: "fr_FR", label: "French" },
        { value: "en_GB", label: "English" },
        { value: "de_DE", label: "German" },
        { value: "es_ES", label: "Spanish" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "billing_address", type: "object", label: "Billing address" },
    { key: "external_reference", type: "string", label: "External reference" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request("/individual_customers", {
      method: "POST",
      body: compact(input),
    });
  },
};

export default createIndividualCustomer;
