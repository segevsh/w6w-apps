import type { ActionDefinition } from "@w6w/types";
import { compact, conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam, requireText } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
  message: string;
  agentId?: string;
  createdAt?: string;
}

const noteAdd: ActionDefinition<Input> = {
  key: "note-add",
  type: "perform",
  resource: "note",
  title: "Add Internal Note",
  description: "Add a private internal note to a conversation. The end user never sees it.",
  idempotent: false,
  params: [
    conversationIdParam,
    { key: "message", label: "Note", type: "text", required: true },
    {
      key: "agentId",
      label: "Author agent id",
      type: "string",
      hint: "Optional agent UUID to author the note as.",
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "string",
      hint: "Optional ISO 8601 timestamp, e.g. when importing history.",
    },
  ],
  output: [{
    key: "data",
    type: "object",
    label: "The note: { id, authorId, createdAt, csid, message }",
  }],

  execute(input, ctx) {
    const id = conversationId(input.conversationId);
    return new DixaClient(ctx).json(`/conversations/${id}/notes`, {
      method: "POST",
      body: {
        message: requireText(input.message, "message"),
        ...compact({ agentId: input.agentId?.trim(), createdAt: input.createdAt?.trim() }),
      },
    });
  },
};

export default noteAdd;
