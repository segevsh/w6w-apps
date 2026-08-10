import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `DELETE /v1/contact_notes/{id}` — remove a note.
 *
 * Idempotent: deleting an already-deleted note converges, and the 404 a repeat
 * produces is the correct answer rather than a new failure.
 */
interface Input {
  id: string;
}

const contactNoteDelete: ActionDefinition<Input> = {
  key: "contact-note-delete",
  type: "perform",
  resource: "contact-note",
  title: "Delete Contact Note",
  description: "Delete a contact note.",
  idempotent: true,
  params: [idParam("Note ID", "`contact-note-list` returns the ids.")],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/contact_notes/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default contactNoteDelete;
