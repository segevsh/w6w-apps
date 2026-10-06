import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SynthflowClient } from "../lib/client.ts";

interface Input {
  contact_id: string;
  name?: string;
  phone_number?: string;
  email?: string;
  contact_metadata?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact; only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "contact_id", label: "Contact ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "phone_number", label: "Phone number", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "contact_metadata", label: "Metadata", type: "json" },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/contacts/${encodeURIComponent(input.contact_id)}`,
      {
        method: "PATCH",
        body: compact({
          name: input.name,
          phone_number: input.phone_number,
          email: input.email,
          contact_metadata: asOptionalJson(input.contact_metadata, "contact_metadata"),
        }),
      },
    );
  },
};

export default contactUpdate;
