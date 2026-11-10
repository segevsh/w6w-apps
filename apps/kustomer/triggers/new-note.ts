import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/note-list.ts";

export default snapshotTrigger({
  key: "new-note",
  title: "New Note on Conversation",
  description:
    "The run gets each internal note newly added to the chosen conversation, polled from the existing `note-list` action (the whole note list, diffed by id).",
  action,
  input: (params) => ({ conversationId: params.conversationId }),
  params: [
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "attributes", type: "object", label: "Note attributes (body, createdAt)" },
  ],
  sample: {
    id: "5f0a1b2c3d4e5f6a7b8c9d10",
    type: "note",
    attributes: { body: "Refund approved", createdAt: "2026-11-09T10:00:00.000Z" },
  },
});
