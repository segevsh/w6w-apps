import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  undo?: boolean;
}

/**
 * `DELETE /contacts/{contact_id}` — requires the `delete_contacts` permission. Repeating the
 * request with `undo=true` restores the most recent deletion (window depends on the plan, 1 to 60
 * days).
 */
const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact, or restore a deleted one with Undo.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "undo",
      label: "Undo deletion",
      type: "boolean",
      default: false,
      hint: "Restore the most recently deleted contact with this ID instead of deleting.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "True when the call succeeded" }],

  async execute(input, ctx) {
    await new OnePageClient(ctx).data(`/contacts/${encodeId(input.contactId)}`, {
      method: "DELETE",
      query: { undo: input.undo ? true : undefined },
    });
    return { deleted: !input.undo, restored: input.undo === true };
  },
};

export default deleteContact;
