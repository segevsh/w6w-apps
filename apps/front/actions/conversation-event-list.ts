import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /conversations/{conversation_id}/events` — verified against Front's own
 * OpenAPI document (`list-conversation-events`).
 *
 * The audit trail of one conversation: assigned, unassigned, archived,
 * reopened, tagged, commented, moved. It answers the questions the conversation
 * object cannot, because that object only holds the *current* state — when did
 * this get archived, who reopened it, how long did it sit unassigned.
 *
 * Each event carries `type`, `emitted_at` (Unix seconds) and a `target` naming
 * the thing that changed, so a workflow measuring response time reads this
 * rather than diffing snapshots.
 */
const action: ActionDefinition = {
  key: "conversation-event-list",
  type: "read",
  resource: "conversation",
  title: "List conversation events",
  description:
    "What happened to a conversation and when — assignments, tags, archives, reopens. The " +
    "history the conversation object does not keep.",
  params: [CONVERSATION_PARAM, ...LIST_PARAMS],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "emitted_at", type: "number", label: "Emitted At (Unix seconds)" },
    { key: "source", type: "object", label: "Source" },
    { key: "target", type: "object", label: "Target" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    return await new FrontClient(ctx).requestAll(
      `/conversations/${encodeURIComponent(conversationId)}/events`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
