import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SynthflowClient } from "../lib/client.ts";

interface Input {
  name: string;
  phone_number: string;
  email?: string;
  contact_metadata?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "phone_number",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "E.164 format.",
    },
    { key: "email", label: "Email", type: "string" },
    {
      key: "contact_metadata",
      label: "Metadata",
      type: "json",
      hint: 'Additional metadata object, e.g. { "company": "Acme" }.',
    },
  ],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>("/contacts", {
      method: "POST",
      body: compact({
        name: input.name,
        phone_number: input.phone_number,
        email: input.email,
        contact_metadata: asOptionalJson(input.contact_metadata, "contact_metadata"),
      }),
    });
  },
};

export default contactCreate;
