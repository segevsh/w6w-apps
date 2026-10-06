import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { noteIdParam, noteOutput, seg } from "../lib/params.ts";

/** `PUT /v1/notes/{noteId}/archived` (operationId `updateNoteArchivedState`). */
interface Input {
  noteId: string;
  archived: boolean;
}

const noteArchiveSet: ActionDefinition<Input> = {
  key: "note-archive-set",
  type: "perform",
  resource: "note",
  title: "Archive or Unarchive Note",
  description: "Archive a note, or restore it from the archive.",
  idempotent: true,
  params: [
    noteIdParam,
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      required: true,
      default: true,
      hint: "On archives the note; off unarchives it.",
    },
  ],
  output: noteOutput,

  execute(input, ctx) {
    if (typeof input.archived !== "boolean") throw new Error("archived must be true or false");
    return new SliteClient(ctx).request(`/notes/${seg(input.noteId, "noteId")}/archived`, {
      method: "PUT",
      body: { archived: input.archived },
    });
  },
};

export default noteArchiveSet;
