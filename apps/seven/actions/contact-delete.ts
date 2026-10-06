import type { ActionDefinition } from "@w6w/types";
import { encodeId, SevenClient } from "../lib/client.ts";

/** `DELETE /api/contacts/:id` — the documented answer carries no body. */
interface Input {
  id: number;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact from the contact list.",
  idempotent: true,
  params: [{ key: "id", label: "Contact ID", type: "number", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "True once the call was accepted" }],

  async execute(input, ctx) {
    await new SevenClient(ctx).request("DELETE", `/contacts/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default contactDelete;
