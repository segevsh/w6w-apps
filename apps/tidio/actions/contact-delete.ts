import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/** `DELETE /contacts/{contactId}` -> 204. Irreversible. */
type Input = { contact_id: string };

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact. Tidio cannot recover a deleted contact.",
  idempotent: true,
  params: [str("contact_id", "Contact ID", { required: true, hint: "The contact's UUID." })],
  output: [
    { key: "deleted", type: "boolean", label: "True when the contact was deleted" },
    { key: "id", type: "string", label: "Contact ID" },
  ],
  async execute(input, ctx) {
    await call(ctx, "DELETE", `/contacts/${encodeId(input.contact_id)}`);
    return { deleted: true, id: input.contact_id };
  },
};

export default contactDelete;
