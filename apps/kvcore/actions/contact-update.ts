import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";
import { contactBody, contactFields } from "../lib/params.ts";

interface Input extends Record<string, unknown> {
  contact_id: string;
}

/** `PUT /v2/public/contact/{contact_id}` — update an existing contact. */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on an existing contact. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "contact_id", label: "Contact ID", type: "string", required: true },
    ...contactFields({ create: false }),
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const { contact_id, ...fields } = input;
    return await new KvCoreClient(ctx).json(`/contact/${encodeURIComponent(contact_id)}`, {
      method: "PUT",
      body: contactBody(fields),
    });
  },
};

export default contactUpdate;
