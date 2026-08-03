import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/** `DELETE /contacts/v4/contacts/{contactId}` — handler `wix.contacts.v4.contact:DeleteContact`. */
const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  /** Idempotent: the contact is gone after one call, and a retry removes nothing further. */
  idempotent: true,
  title: "Delete Contact",
  description:
    "Delete a contact. Wix soft-deletes to a trash bin with a 90-day recovery window; a contact who is also a site member must be removed through the Members API instead.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting contact", { contactId: input.contactId });
    await new WixClient(ctx).request(
      `/contacts/v4/contacts/${encodeURIComponent(input.contactId)}`,
      { method: "DELETE" },
    );
    // Wix answers this one with an empty body, so there is nothing to pass on
    // but the fact that it succeeded — the client already threw on any non-2xx.
    return { status: 200 };
  },
};

export default deleteContact;
