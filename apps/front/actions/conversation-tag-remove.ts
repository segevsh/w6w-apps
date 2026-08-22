import type { ActionDefinition } from "@w6w/types";
import { csv, FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `DELETE /conversations/{conversation_id}/tags` — verified against Front's own
 * OpenAPI document (`remove-conversation-tag`).
 *
 * The removal half of tagging. Note the shape: Front takes the tag ids in a
 * **request body on a DELETE**, which is unusual enough that a client that
 * strips bodies from DELETEs will appear to succeed and change nothing. This
 * app sends it.
 *
 * Removing a tag the conversation does not have is not an error, so this is
 * safe to retry.
 */
const action: ActionDefinition = {
  key: "conversation-tag-remove",
  type: "perform",
  resource: "conversation",
  title: "Remove tags from conversation",
  description: "Take one or more tags off a conversation, leaving the others in place.",
  idempotent: true,
  params: [
    CONVERSATION_PARAM,
    {
      key: "tagIds",
      label: "Tag IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "tag_155",
      hint: "Comma-separated tag ids.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Untagged" },
    { key: "tagIds", type: "array", label: "Tag IDs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const tagIds = csv(p.tagIds);
    if (!tagIds) throw new Error("`tagIds` is required");

    ctx.log("info", "removing tags from Front conversation", { conversationId, tagIds });
    // A DELETE that carries a body — Front's shape, not a mistake.
    await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}/tags`,
      { method: "DELETE", body: { tag_ids: tagIds } },
    );
    return { ok: true, tagIds };
  },
};

export default action;
