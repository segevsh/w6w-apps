import type { ActionDefinition } from "@w6w/types";
import { csv, FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `POST /conversations/{conversation_id}/tags` — verified against Front's own
 * OpenAPI document (`add-conversation-tag`).
 *
 * This is the **additive** half of tagging, and the reason `conversation-update`
 * does not offer a tag field: the `tag_ids` on the update route *replaces* the
 * whole set, so tagging through it quietly untags everything else. This route
 * adds, leaves the rest alone, and is idempotent — adding a tag that is already
 * on the conversation is not an error.
 *
 * Tags are given by **id**, not by name (`tag-list` maps one to the other), and
 * a tag has to exist before it can be applied — Front does not create one on
 * demand here the way the contact routes create contact lists.
 */
const action: ActionDefinition = {
  key: "conversation-tag-add",
  type: "perform",
  resource: "conversation",
  title: "Add tags to conversation",
  description:
    "Add one or more existing tags, leaving the conversation's other tags alone. Ids, not " +
    "names — List Tags maps between them.",
  idempotent: true,
  params: [
    CONVERSATION_PARAM,
    {
      key: "tagIds",
      label: "Tag IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "tag_155,tag_156",
      hint: "Comma-separated tag ids. The tags must already exist.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Tagged" },
    { key: "tagIds", type: "array", label: "Tag IDs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const tagIds = csv(p.tagIds);
    if (!tagIds) throw new Error("`tagIds` is required");

    ctx.log("info", "adding tags to Front conversation", { conversationId, tagIds });
    await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}/tags`,
      { method: "POST", body: { tag_ids: tagIds } },
    );
    return { ok: true, tagIds };
  },
};

export default action;
