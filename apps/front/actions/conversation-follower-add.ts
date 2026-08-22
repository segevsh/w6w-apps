import type { ActionDefinition } from "@w6w/types";
import { csv, FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `POST /conversations/{conversation_id}/followers` — verified against Front's
 * own OpenAPI document (`add-conversation-followers`).
 *
 * Following is Front's "keep me in the loop" — a follower gets the
 * conversation's activity without owning it. That distinction is the useful one
 * for a workflow: **assigning** hands over responsibility and shows up in
 * somebody's queue; **following** just subscribes them. An escalation that
 * assigns the manager takes the conversation away from the agent handling it;
 * one that adds them as a follower does not.
 *
 * Front caps the list at **50 teammates per call**, so this refuses a longer
 * list rather than sending it and reading back a validation error.
 */
const action: ActionDefinition = {
  key: "conversation-follower-add",
  type: "perform",
  resource: "conversation",
  title: "Add followers",
  description: "Subscribe teammates to a conversation's activity without giving it to them — the " +
    "non-destructive half of an escalation.",
  idempotent: true,
  params: [
    CONVERSATION_PARAM,
    {
      key: "teammateIds",
      label: "Teammate IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "tea_55c8c149,alt:email:ada@example.com",
      hint: "Comma-separated, up to 50. Ids or `alt:email:…` aliases.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Followers added" },
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

    ctx.log("info", "adding Front conversation followers", { conversationId, teammateIds });
    await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}/followers`,
      { method: "POST", body: { teammate_ids: teammateIds } },
    );
    return { ok: true, teammateIds };
  },
};

export default action;
