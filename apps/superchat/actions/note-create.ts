import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  content: string;
  fileIds?: string[];
}

/** Add an internal note (never sent to the contact) to a conversation. */
const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Conversation Note",
  description: "Add an internal note (never sent to the contact) to a conversation.",
  idempotent: false,
  params: [
    { "key": "conversationId", "label": "Conversation ID", "type": "string", "required": true },
    {
      "key": "content",
      "label": "Content",
      "type": "text",
      "required": true,
      "hint": "Must contain a non-whitespace character.",
    },
    {
      "key": "fileIds",
      "label": "File IDs",
      "type": "json",
      "hint": "Array of uploaded file ids to attach.",
    },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Note ID" },
    { "key": "content", "type": "string", "label": "Content" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/conversations/${seg(input.conversationId)}/notes`, {
      method: "POST",
      body: { content: input.content, ...(input.fileIds ? { file_ids: input.fileIds } : {}) },
    });
  },
};

export default noteCreate;
