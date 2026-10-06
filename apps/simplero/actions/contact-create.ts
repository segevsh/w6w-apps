import type { ActionDefinition } from "@w6w/types";
import { SimpleroClient } from "../lib/client.ts";
import { contactBody, contactFieldParams, type ContactFields } from "../lib/params.ts";

interface Input extends ContactFields {
  email: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact (Simplero's `customers` resource). Creating a contact does not subscribe " +
    "it to any list or tag it — follow with Subscribe to List or Add Tag.",
  // Simplero documents no idempotency key and does not say a repeated create is a no-op.
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    ...contactFieldParams,
  ],
  output: [{ key: "record", type: "object", label: "The created contact" }],

  async execute(input, ctx) {
    const record = await new SimpleroClient(ctx).write("POST", "/customers", contactBody(input));
    return { record };
  },
};

export default contactCreate;
