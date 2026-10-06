import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient, encodeId } from "../lib/client.ts";
import { conversationIdParam } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
  tagId: string;
}

const conversationTagRemove: ActionDefinition<Input> = {
  key: "conversation-tag-remove",
  type: "perform",
  resource: "tag",
  title: "Remove Tag from Conversation",
  description: "Take a tag off a conversation.",
  idempotent: true,
  params: [
    conversationIdParam,
    {
      key: "tagId",
      label: "Tag id",
      type: "string",
      required: true,
      hint: "Tag UUID — list them with Tag List.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Dixa answered 204" },
    { key: "conversationId", type: "string", label: "The conversation id" },
    { key: "tagId", type: "string", label: "The tag id" },
  ],

  async execute(input, ctx) {
    const id = conversationId(input.conversationId);
    const tagId = encodeId(input.tagId, "tagId");
    await new DixaClient(ctx).json(`/conversations/${id}/tags/${tagId}`, { method: "DELETE" });
    return { ok: true, conversationId: id, tagId: input.tagId.trim() };
  },
};

export default conversationTagRemove;
