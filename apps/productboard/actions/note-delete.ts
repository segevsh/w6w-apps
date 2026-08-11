import type { ActionDefinition } from "@w6w/types";
import { type DeleteResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { noteIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/notes/{id}` — delete a note.
 *
 * Unlike `entity-delete`, this does not cascade: the vendor's migration guide
 * lists exactly three cascading deletes (feature, release group, release) and a
 * note is none of them. It is still destructive and still has no undo, so
 * archiving via `note-update` (`{"archived": true}`) is usually what a workflow
 * actually wants — that keeps the feedback and its insight links.
 *
 * **Idempotent.** The second call answers 404, which is surfaced rather than
 * swallowed so a workflow does not read "wrong id" as "already deleted".
 */
interface Input {
  noteId: string;
}

const noteDelete: ActionDefinition<Input, DeleteResult> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete note",
  description:
    "Permanently delete a note. Consider archiving instead (Update note with archived: true), " +
    "which keeps the feedback and its links to features.",
  idempotent: true,
  params: [noteIdParam],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "deleted", type: "boolean", label: "The note was deleted" },
  ],

  async execute(input, ctx) {
    ctx.log("warn", "deleting Productboard note", { id: input.noteId });
    const status = await new ProductboardClient(ctx).status(
      `/notes/${encodeId(input.noteId)}`,
      { method: "DELETE" },
    );
    return { status, deleted: status === 204 };
  },
};

export default noteDelete;
