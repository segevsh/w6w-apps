import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /conversations/{conversation_id}/messages` — verified against Front's
 * own OpenAPI document (`list-conversation-messages`).
 *
 * The messages on a thread, newest first. Two things about what comes back:
 *
 *   - **Comments are not here.** Front keeps customer-visible messages and
 *     internal comments in separate collections, which is the whole point of a
 *     shared inbox — `conversation-comment-list` reads the other one. Anything
 *     summarising a thread needs both.
 *   - **`body` is HTML, `text` is the plain-text twin.** For a model or a
 *     digest, `text` is the field that does not need stripping; for anything
 *     rendered, `body` keeps the formatting and the quoted history.
 *
 * `is_inbound` distinguishes what the customer wrote from what the team replied,
 * and `is_draft` marks a message that has not been sent — a draft is in the
 * list, and counting it as a reply overstates what the customer has seen.
 */
const action: ActionDefinition = {
  key: "conversation-message-list",
  type: "read",
  resource: "conversation",
  title: "List messages",
  description:
    "The customer-visible messages on a conversation. Internal comments are a separate " +
    "collection — List Comments reads those.",
  params: [CONVERSATION_PARAM, ...LIST_PARAMS],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "body", type: "string", label: "Body (HTML)" },
    { key: "text", type: "string", label: "Body (plain text)" },
    { key: "is_inbound", type: "boolean", label: "From the customer" },
    { key: "is_draft", type: "boolean", label: "Unsent draft" },
    { key: "created_at", type: "number", label: "Created At" },
    { key: "author", type: "object", label: "Author" },
    { key: "recipients", type: "array", label: "Recipients" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    return await new FrontClient(ctx).requestAll(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
