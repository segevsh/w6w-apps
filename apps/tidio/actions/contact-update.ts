import type { ActionDefinition } from "@w6w/types";
import { call, contactBody, encodeId, pick } from "../lib/client.ts";
import { contactFields, str } from "../lib/params.ts";

/** `PATCH /contacts/{contactId}` -> 204. */
type Input = {
  contact_id: string;
  distinct_id?: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  email_consent?: string;
  properties?: unknown;
};

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact's fields and custom properties. Only the fields you set are sent.",
  idempotent: true,
  params: [
    str("contact_id", "Contact ID", { required: true, hint: "The contact's UUID." }),
    str("distinct_id", "Distinct ID", { validation: { maxLength: 55 } }),
    ...contactFields,
  ],
  output: [
    { key: "updated", type: "boolean", label: "True when Tidio accepted the update" },
    { key: "id", type: "string", label: "Contact ID" },
  ],
  async execute(input, ctx) {
    const body = { ...pick(input, ["distinct_id"]), ...contactBody(input) };
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update: set at least one field");
    }
    await call(ctx, "PATCH", `/contacts/${encodeId(input.contact_id)}`, { body });
    return { updated: true, id: input.contact_id };
  },
};

export default contactUpdate;
