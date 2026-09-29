import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";

interface Input {
  contactId: number;
  noteId: number;
}

interface Output {
  deleted: boolean;
}

const noteDelete: ActionDefinition<Input, Output> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Contact Note",
  description: "Delete a note from a contact. Redtail answers 204 No Content on success.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "noteId", label: "Note ID", type: "number", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new RedtailClient(ctx).request(
      `/contacts/${input.contactId}/notes/${input.noteId}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default noteDelete;
