import type { ActionDefinition } from "@w6w/types";
import { call, contactBody } from "../lib/client.ts";
import { contactFields, str } from "../lib/params.ts";

/** `POST /contacts` -> 201 `{id}`. */
type Input = {
  distinct_id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  email_consent?: string;
  properties?: unknown;
};

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact. The distinct ID is your own identifier for them (max 55 characters).",
  idempotent: false,
  params: [
    str("distinct_id", "Distinct ID", {
      required: true,
      hint: "The contact's ID in your own system (max 55 characters).",
      validation: { maxLength: 55 },
    }),
    ...contactFields,
  ],
  output: [{ key: "id", type: "string", label: "New contact ID" }],
  async execute(input, ctx) {
    if (!input.distinct_id?.trim()) throw new Error("distinct_id is required");
    const body = await call(ctx, "POST", "/contacts", {
      body: { distinct_id: input.distinct_id.trim(), ...contactBody(input) },
    });
    return { id: (body as { id?: string } | null)?.id ?? null };
  },
};

export default contactCreate;
