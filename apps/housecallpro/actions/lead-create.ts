import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /leads` — create a lead.
 *
 * Two either/or pairs the reference states in its own field descriptions, and
 * which is why neither half is marked `required` here:
 *
 *  - `customer_id` — "Either this or Customer required"; `customer` — "Either
 *    this or Customer ID required".
 *  - `address_id` or an inline `address` object, the same way.
 *
 * A `Param` cannot express "exactly one of these two", so both are optional and
 * the pairing is stated in each hint. The API rejects a body with neither.
 */
interface Input {
  customerId?: string;
  customer?: unknown;
  addressId?: string;
  address?: unknown;
  assignedEmployeeId?: string;
  leadSource?: string;
  note?: string;
  tags?: string[] | string;
  lineItems?: unknown;
  taxName?: string;
  taxRate?: number;
  companyId?: string;
}

const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description:
    "Create a lead. Supply either a customer id or an inline customer object, and either an " +
    "address id or an inline address object.",
  // No dedupe key and no unique field: a retry creates a second lead.
  idempotent: false,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "Either this or Customer. One of the two is required.",
    },
    {
      key: "customer",
      label: "Customer",
      type: "json",
      hint: "Either this or Customer ID. {first_name, last_name, email, mobile_number, company, " +
        "home_number, work_number, lead_source, notes, tags, addresses}.",
    },
    {
      key: "addressId",
      label: "Address ID",
      type: "string",
      hint: "Either this or Address.",
    },
    {
      key: "address",
      label: "Address",
      type: "json",
      hint: "Either this or Address ID. {street, street_line_2, city, state, zip}.",
    },
    { key: "assignedEmployeeId", label: "Assigned employee ID", type: "string" },
    { key: "leadSource", label: "Lead source", type: "string" },
    { key: "note", label: "Note", type: "text" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names." },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      hint: "Array of {name, description, kind, quantity, unit_price, unit_cost}. Prices are in " +
        "cents. `kind` here is labor, materials, fixed discount or percent discount — the lead " +
        "enum omits `fixed gratuity`, which the job enum has.",
    },
    { key: "taxName", label: "Tax name", type: "string" },
    { key: "taxRate", label: "Tax rate", type: "number" },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "number", type: "number", label: "Lead number" },
    { key: "status", type: "string", label: "Status" },
    { key: "customer", type: "object", label: "Customer" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating lead", { customerId: input.customerId });
    return new HousecallClient(ctx).json("/leads", {
      method: "POST",
      companyId: input.companyId,
      body: compact({
        customer_id: input.customerId,
        customer: asOptionalJson<unknown>(input.customer, "Customer"),
        address_id: input.addressId,
        address: asOptionalJson<unknown>(input.address, "Address"),
        assigned_employee_id: input.assignedEmployeeId,
        lead_source: input.leadSource,
        note: input.note,
        tags: toList(input.tags),
        line_items: asOptionalJson<unknown[]>(input.lineItems, "Line items"),
        tax_name: input.taxName,
        tax_rate: input.taxRate,
      }),
    });
  },
};

export default leadCreate;
