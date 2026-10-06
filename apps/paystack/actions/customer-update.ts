import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, PaystackClient, required } from "../lib/client.ts";

/** `PUT /customer/{code}` — email cannot be changed. */
interface Input {
  code: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata?: string;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer's name, phone or metadata. Only the fields given are sent.",
  idempotent: true,
  params: [
    {
      key: "code",
      label: "Customer code",
      type: "string",
      required: true,
      hint: "e.g. CUS_c6wqvwmvwopw4ms",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "metadata", label: "Metadata", type: "string", hint: "A JSON-encoded string." },
  ],
  output: [
    { key: "customer_code", type: "string", label: "Customer code" },
    { key: "email", type: "string", label: "Email" },
  ],
  async execute(input, ctx) {
    const code = required(input.code, "Customer code");
    const body = compact({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      metadata: input.metadata,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update: give at least one field");
    }
    return await new PaystackClient(ctx).data(`/customer/${encodeId(code)}`, {
      method: "PUT",
      body,
    });
  },
};

export default customerUpdate;
