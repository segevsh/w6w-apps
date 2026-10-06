import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  noteId: string;
  content: string;
  fileIds?: string[];
}

/** Replace a note's content (and attached files, if given). */
const noteUpdate: ActionDefinition<Input> = {
  key: "note-update",
  type: "perform",
  resource: "note",
  title: "Update Conversation Note",
  description: "Replace a note's content (and attached files, if given).",
  idempotent: true,
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
    { "key": "noteId", "label": "Note ID", "type": "string", "required": true },
    { "key": "content", "label": "Content", "type": "text", "required": true },
    { "key": "fileIds", "label": "File IDs", "type": "json" },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Note ID" },
    { "key": "content", "type": "string", "label": "Content" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(
      `/conversations/${seg(input.conversationId)}/notes/${seg(input.noteId)}`,
      {
        method: "PUT",
        body: { content: input.content, ...(input.fileIds ? { file_ids: input.fileIds } : {}) },
      },
    );
  },
};

export default noteUpdate;
