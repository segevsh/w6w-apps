import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { noteIdParam, seg } from "../lib/params.ts";

/**
 * `DELETE /v1/notes/{noteId}` (operationId `deleteNoteById`) — answers `204` with no body.
 *
 * Slite's own description: "Delete a note and its children by id. !!! It's irreversible !!!".
 * Archive instead (`note-archive-set`) when the note might be wanted back.
 */
interface Input {
  noteId: string;
}

const noteDelete: ActionDefinition<Input> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  description: "Permanently delete a note AND all its children. Irreversible — archive instead " +
    "if unsure.",
  idempotent: false,
  params: [noteIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "True once Slite answered 204" },
    { key: "noteId", type: "string", label: "The deleted note's id" },
  ],

  async execute(input, ctx) {
    const id = seg(input.noteId, "noteId");
    await new SliteClient(ctx).request(`/notes/${id}`, { method: "DELETE" });
    return { deleted: true, noteId: input.noteId.trim() };
  },
};

export default noteDelete;
