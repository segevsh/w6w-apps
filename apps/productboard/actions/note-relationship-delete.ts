import type { ActionDefinition } from "@w6w/types";
import { type DeleteResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { noteIdParam, noteRelationshipTypeOptions } from "../lib/params.ts";

/**
 * `DELETE /v2/notes/{id}/relationships/{targetType}/{targetId}` — unlink a note.
 *
 * `targetType` here is the **relationship** type (`customer` or `link`), which
 * is not the same vocabulary the create body uses for `target.type`. The path
 * segment is the relationship kind; the body's `target.type` is `user`,
 * `company` or the literal `link`. Mixing them up produces a 404 rather than an
 * explanation.
 *
 * Removes the link only — the note and the entity both survive.
 *
 * **Idempotent.**
 */
interface Input {
  noteId: string;
  targetType: string;
  targetId: string;
}

const noteRelationshipDelete: ActionDefinition<Input, DeleteResult> = {
  key: "note-relationship-delete",
  type: "perform",
  resource: "note",
  title: "Unlink note",
  description:
    "Remove a note's customer relationship or one of its product links. Deletes the link only.",
  idempotent: true,
  params: [
    noteIdParam,
    {
      key: "targetType",
      label: "Relationship type",
      type: "select",
      required: true,
      options: noteRelationshipTypeOptions,
      hint: "The path segment is the RELATIONSHIP kind (customer or link), not the entity type.",
    },
    {
      key: "targetId",
      label: "Target ID",
      type: "string",
      required: true,
      hint: "UUID of the linked entity, user or company.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "deleted", type: "boolean", label: "The relationship was removed" },
  ],

  async execute(input, ctx) {
    const status = await new ProductboardClient(ctx).status(
      `/notes/${encodeId(input.noteId)}/relationships/${encodeId(input.targetType)}/${
        encodeId(input.targetId)
      }`,
      { method: "DELETE" },
    );
    return { status, deleted: status === 204 };
  },
};

export default noteRelationshipDelete;
