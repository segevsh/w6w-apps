import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /conversations/{conversation_id}/comments` — verified against Front's
 * own OpenAPI document (`list-conversation-comments`).
 *
 * The internal side of a thread. Reading it is how a workflow picks up context
 * the team wrote for itself — the reason a conversation was escalated, the
 * decision somebody recorded — none of which appears in the messages.
 *
 * A comment's `body` is markdown as typed, and its `author` is a teammate
 * rather than a contact, which is the field that distinguishes a comment from a
 * message when the two are merged into one timeline.
 */
const action: ActionDefinition = {
  key: "conversation-comment-list",
  type: "read",
  resource: "comment",
  title: "List comments",
  description: "The internal comments on a conversation — what the team said, not the customer.",
  params: [CONVERSATION_PARAM, ...LIST_PARAMS],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "body", type: "string", label: "Body" },
    { key: "posted_at", type: "number", label: "Posted At" },
    { key: "author", type: "object", label: "Author" },
    { key: "is_pinned", type: "boolean", label: "Pinned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    return await new FrontClient(ctx).requestAll(
      `/conversations/${encodeURIComponent(conversationId)}/comments`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
