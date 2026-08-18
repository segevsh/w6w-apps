import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `GET /conversations/{conversation_id}` — verified against Front's own OpenAPI
 * document (`get-conversation`).
 *
 * Returns the conversation's own state — status, assignee, tags, recipient,
 * custom fields, links — and **not** its messages. Those are a separate call
 * (`conversation-message-list`), which is why reading a thread costs two
 * requests rather than one.
 *
 * The id may be a **conversation alias** as well as a `cnv_…` id: Front accepts
 * `alt:tag:<tag id>` style aliases on this route, which is how a workflow can
 * look a conversation up by something it already knows.
 */
const action: ActionDefinition = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get conversation",
  description:
    "One conversation's status, assignee, tags, recipient and custom fields. Messages are a " +
    "separate call.",
  params: [CONVERSATION_PARAM],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "assignee", type: "object", label: "Assignee" },
    { key: "recipient", type: "object", label: "Recipient" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "custom_fields", type: "object", label: "Custom Fields" },
  ],

  async execute(input, ctx) {
    const { conversationId } = input as { conversationId: string };
    if (!conversationId) throw new Error("`conversationId` is required");
    return await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}`,
    );
  },
};

export default action;
