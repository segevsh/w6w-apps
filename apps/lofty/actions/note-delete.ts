import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `DELETE /v1.0/notes/{noteId}` — delete a note.
 *
 * The caller must have manage permission on the lead that owns the note. The
 * response body is empty, so the id and HTTP status are returned.
 */
interface Input {
  noteId: number;
}

const action: ActionDefinition<Input> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  description: "Delete a note by id (DELETE /v1.0/notes/{noteId}).",
  idempotent: true,
  params: [
    {
      key: "noteId",
      label: "Note ID",
      type: "number",
      required: true,
      hint: "The `noteId` from a List Notes row.",
    },
  ],
  output: [
    { key: "noteId", type: "number", label: "Deleted note ID" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new LoftyClient(ctx).status(`/notes/${input.noteId}`, {
      method: "DELETE",
    });
    return { noteId: input.noteId, status };
  },
};

export default action;
