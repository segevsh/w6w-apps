import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  noteId: string;
  onBehalfOf?: string;
}

const noteDelete: ActionDefinition<Input> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  description: "Permanently delete a note AND all of its recordings. Requires a Super Admin key.",
  idempotent: false,
  params: [
    {
      key: "noteId",
      label: "Note ID",
      type: "string",
      required: true,
      hint: "The note to delete. Permanent: its recordings are deleted with it.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "message", type: "string", label: "Confirmation message" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).request(`/note/${encodeId(input.noteId)}`, {
      method: "DELETE",
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default noteDelete;
