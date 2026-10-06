import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `PUT /v1/{source_id}/customers/{oid}` — Update a customer's name, email, notes or created time. Only customers added through the API can be modified. */
interface Input {
  source_id: string;
  oid: string;
  name?: string;
  email?: string;
  notes?: string;
  created?: number;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer's name, email, notes or created time. Only customers added through the API can be modified.",
  idempotent: true,
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
    { key: "email", label: "Email", type: "string" },
    { key: "notes", label: "Notes", type: "string" },
    { key: "created", label: "Created (unix timestamp)", type: "number" },
  ],
  output: [
    { key: "customer", type: "object", label: "The updated customer" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "PUT",
      `/${encodeId(input.source_id)}/customers/${encodeId(input.oid)}`,
      {
        body: { name: input.name, email: input.email, notes: input.notes, created: input.created },
      },
    );
  },
};

export default customerUpdate;
