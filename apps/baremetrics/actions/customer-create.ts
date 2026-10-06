import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `POST /v1/{source_id}/customers` — Create a customer in the Baremetrics API source. Only oid is required. */
interface Input {
  source_id: string;
  oid: string;
  name?: string;
  email?: string;
  notes?: string;
  created?: number;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer in the Baremetrics API source. Only oid is required.",
  idempotent: false,
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "oid", label: "Customer OID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Used to look up extra profile information.",
    },
    {
      key: "notes",
      label: "Notes",
      type: "string",
      hint: "Your own notes, shown on the customer profile.",
    },
    { key: "created", label: "Created (unix timestamp)", type: "number", hint: "Defaults to now." },
  ],
  output: [
    { key: "customer", type: "object", label: "The created customer" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("POST", `/${encodeId(input.source_id)}/customers`, {
      body: {
        oid: input.oid,
        name: input.name,
        email: input.email,
        notes: input.notes,
        created: input.created,
      },
    });
  },
};

export default customerCreate;
