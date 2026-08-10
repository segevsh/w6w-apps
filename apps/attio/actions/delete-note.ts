import type { ActionDefinition } from "@w6w/types";
import { AttioClient } from "../lib/client.ts";

interface Input {
  noteId: string;
}

/**
 * `DELETE /v2/notes/{note_id}` — remove a note.
 *
 * Notes have no archived state, so this is permanent. The response is `200` with
 * an empty object; `deleted: true` below is this action's summary of a
 * successful call, not a field Attio returned.
 *
 * There is deliberately no Update Note action in this app: Attio publishes no
 * note update endpoint. The notes surface is create, read, list and delete —
 * editing a note means deleting it and creating another, which loses the
 * original `created_at` unless it is passed back explicitly.
 */
const deleteNote: ActionDefinition<Input> = {
  key: "delete-note",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  idempotent: true,
  description:
    "Permanently delete a note. Notes cannot be archived and Attio publishes no update endpoint " +
    "for them, so this is the only way to remove one.",
  params: [
    {
      key: "noteId",
      label: "Note id",
      type: "string",
      required: true,
      placeholder: "10ee8e4b-e0f6-4a2d-9d02-2b1b3b0ba9d1",
      hint: "UUID of the note. There is no undo.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when Attio accepted the delete" },
    { key: "note_id", type: "string", label: "The id that was deleted" },
  ],

  async execute(input, ctx) {
    await new AttioClient(ctx).request(`/notes/${encodeURIComponent(input.noteId)}`, {
      method: "DELETE",
    });
    return { deleted: true, note_id: input.noteId };
  },
};

export default deleteNote;
