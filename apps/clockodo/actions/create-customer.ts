import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, reqString } from "../lib/client.ts";

interface Input {
  name: string;
  active?: boolean;
  number?: string;
  note?: string;
  billableDefault?: boolean;
  color?: number | string;
}

const createCustomer: ActionDefinition<Input> = {
  key: "create-customer",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer (POST /v3/customers). Only `name` is required.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
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
      hint: "1-9, a fixed palette (1 = blood orange \u2026 9).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The created customer" },
  ],
  idempotent: false,

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v3/customers", {
      body: compact({
        name: reqString(input.name, "name"),
        active: input.active,
        number: input.number,
        note: input.note,
        billable_default: input.billableDefault,
        color: input.color === undefined || input.color === "" ? undefined : Number(input.color),
      }),
    });
    return { data: body.data ?? null };
  },
};

export default createCustomer;
