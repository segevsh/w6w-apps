import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /customers/{id}` — one customer, company or individual.
 *
 * The response is a `oneOf` on the two shapes: a company customer carries
 * `name`/`vat_number`/`reg_no`, an individual one carries
 * `first_name`/`last_name`. The rest — billing and delivery addresses, emails,
 * contacts, mandates, payment conditions, ledger account — is shared.
 */
interface Input {
  id: string;
}

const getCustomer: ActionDefinition<Input> = {
  key: "get-customer",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by id, company or individual (GET /customers/{id}).",
  params: [idParam("Customer")],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "customer_type", type: "string", label: "Company or individual" },
    { key: "name", type: "string", label: "Name" },
    { key: "first_name", type: "string", label: "First name (individuals)" },
    { key: "last_name", type: "string", label: "Last name (individuals)" },
    { key: "vat_number", type: "string", label: "VAT number" },
    { key: "reg_no", type: "string", label: "Registration number" },
    { key: "emails", type: "array", label: "Email addresses" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "billing_address", type: "object", label: "Billing address" },
    { key: "delivery_address", type: "object", label: "Delivery address" },
    { key: "payment_conditions", type: "string", label: "Payment conditions" },
    { key: "billing_iban", type: "string", label: "Billing IBAN" },
    { key: "ledger_account", type: "object", label: "Ledger account" },
    { key: "billing_language", type: "string", label: "Billing language" },
    { key: "external_reference", type: "string", label: "External reference" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request(`/customers/${input.id}`);
  },
};

export default getCustomer;
