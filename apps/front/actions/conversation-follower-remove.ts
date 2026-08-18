import type { ActionDefinition } from "@w6w/types";
import { csv, FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `DELETE /conversations/{conversation_id}/followers` — verified against
 * Front's own OpenAPI document (`delete-conversation-followers`).
 *
 * Unsubscribes teammates. Like the tag removal route, Front takes the ids in a
 * **body on a DELETE**, and the same 50-per-call cap applies.
 */
const action: ActionDefinition = {
  key: "conversation-follower-remove",
  type: "perform",
  resource: "conversation",
  title: "Remove followers",
  description: "Unsubscribe teammates from a conversation's activity.",
  idempotent: true,
  params: [
    CONVERSATION_PARAM,
    {
      key: "teammateIds",
      label: "Teammate IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated, up to 50.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Followers removed" },
    { key: "teammateIds", type: "array", label: "Teammate IDs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const teammateIds = csv(p.teammateIds);
    if (!teammateIds) throw new Error("`teammateIds` is required");
    if (teammateIds.length > 50) {
      throw new Error(`Front accepts at most 50 followers per call; got ${teammateIds.length}`);
    }

    ctx.log("info", "removing Front conversation followers", { conversationId, teammateIds });
    await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}/followers`,
      { method: "DELETE", body: { teammate_ids: teammateIds } },
    );
    return { ok: true, teammateIds };
  },
};

export default action;
