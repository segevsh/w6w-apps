import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  noteId: string;
}

/** Delete a note. This cannot be undone. */
const noteDelete: ActionDefinition<Input> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Conversation Note",
  description: "Delete a note. This cannot be undone.",
  idempotent: true,
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
    { "key": "noteId", "label": "Note ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(
      `/conversations/${seg(input.conversationId)}/notes/${seg(input.noteId)}`,
      { method: "DELETE" },
    );
  },
};

export default noteDelete;
