import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /suppliers/{id}` — one supplier.
 *
 * Carries the French business identifiers (`establishment_no` is the 14-digit
 * SIRET, `reg_no` the 9-digit SIREN), the supplier's own payment method and the
 * due-date rule that drives when its invoices fall due.
 */
interface Input {
  id: string;
}

const getSupplier: ActionDefinition<Input> = {
  key: "get-supplier",
  type: "read",
  resource: "supplier",
  title: "Get Supplier",
  description: "Fetch one supplier by id (GET /suppliers/{id}).",
  params: [idParam("Supplier")],
  output: [
    { key: "id", type: "number", label: "Supplier ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "establishment_no", type: "string", label: "Establishment number (SIRET)" },
    { key: "reg_no", type: "string", label: "Registration number (SIREN)" },
    { key: "vat_number", type: "string", label: "VAT number" },
    { key: "emails", type: "array", label: "Email addresses" },
    { key: "iban", type: "string", label: "IBAN" },
    { key: "postal_address", type: "object", label: "Postal address" },
    { key: "ledger_account", type: "object", label: "Ledger account" },
    { key: "supplier_payment_method", type: "string", label: "Payment method" },
    { key: "supplier_due_date_delay", type: "number", label: "Due-date delay" },
    { key: "supplier_due_date_rule", type: "string", label: "Due-date rule" },
    { key: "external_reference", type: "string", label: "External reference" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request(`/suppliers/${input.id}`);
  },
};

export default getSupplier;
