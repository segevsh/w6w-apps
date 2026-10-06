import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, intId } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  active?: boolean;
  number?: string;
  note?: string;
  billableDefault?: boolean;
  color?: number | string;
}

const updateCustomer: ActionDefinition<Input> = {
  key: "update-customer",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Edit a customer (PUT /v3/customers/{id}). Only the fields you pass are sent; at least one is required.",
  params: [
    {
      key: "id",
      label: "Customer ID",
      type: "string",
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
    },
    {
      key: "number",
      label: "Number",
      type: "string",
    },
    {
      key: "note",
      label: "Note",
      type: "string",
      hint: "Needs administrator or elevated access.",
    },
    {
      key: "billableDefault",
      label: "Billable by default",
      type: "boolean",
    },
    {
      key: "color",
      label: "Color",
      type: "number",
      hint: "1-9.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The updated customer" },
  ],
  idempotent: true,

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const fields = compact({
      name: input.name,
      active: input.active,
      number: input.number,
      note: input.note,
      billable_default: input.billableDefault,
      color: input.color === undefined || input.color === "" ? undefined : Number(input.color),
    });
    if (Object.keys(fields).length === 0) throw new Error("pass at least one field to update");
    const body = await new ClockodoClient(ctx).call(`/v3/customers/${id}`, {
      method: "PUT",
      body: fields,
    });
    return { data: body.data ?? null };
  },
};

export default updateCustomer;
