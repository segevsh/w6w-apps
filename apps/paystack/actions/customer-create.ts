import type { ActionDefinition } from "@w6w/types";
import { compact, PaystackClient, required } from "../lib/client.ts";

/** `POST /customer` — `email` is the only required field. */
interface Input {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata?: string;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer record. Paystack de-duplicates on email.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "metadata",
      label: "Metadata",
      type: "string",
      hint: "A JSON-encoded string, as the OpenAPI document types it.",
    },
  ],
  output: [
    { key: "customer_code", type: "string", label: "Customer code" },
    { key: "id", type: "number", label: "Customer id" },
    { key: "email", type: "string", label: "Email" },
  ],
  async execute(input, ctx) {
    return await new PaystackClient(ctx).data("/customer", {
      method: "POST",
      body: compact({
        email: required(input.email, "Email"),
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        metadata: input.metadata,
      }),
    });
  },
};

export default customerCreate;
