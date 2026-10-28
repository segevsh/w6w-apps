import type { ActionDefinition } from "@w6w/types";
import { API_HOST, type ListResponse, MessengerClient } from "../lib/client.ts";

interface Input {
  conversationId?: string;
  pageUrl?: string;
}

interface MessageSummary {
  id: string;
  created_time?: string | number;
}

interface Result {
  id?: string;
  messages: ListResponse<MessageSummary>;
}

/**
 * List the message ids in a conversation — `GET /{conversation-id}?fields=messages`.
 *
 * The response carries ids and creation times only; fetch the content with `get-message`.
 * Meta returns every id but only exposes the 20 most recent messages' details — an older
 * one answers with a "deleted" error.
 *
 * Paging: when `messages.paging.next` is present, pass it back as `pageUrl` for the next
 * page. It is accepted only on the Graph host.
 */
const listConversationMessages: ActionDefinition<Input, Result> = {
  key: "list-conversation-messages",
  type: "read",
  resource: "conversation",
  title: "List Conversation Messages",
  description: "List the message IDs (and times) in a conversation.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "string" },
    {
      key: "pageUrl",
      label: "Next page URL",
      type: "string",
      hint: "`messages.paging.next` from a previous result; used instead of the conversation ID.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "messages", type: "object", label: "Messages ({ data, paging })" },
  ],

  async execute(input, ctx) {
    const client = new MessengerClient(ctx);
    if (input.pageUrl) {
      const url = new URL(input.pageUrl);
      if (url.hostname !== API_HOST) throw new Error(`pageUrl must be on ${API_HOST}`);
      const page = await client.request<ListResponse<MessageSummary>>(input.pageUrl);
      return { messages: page };
    }
    if (!input.conversationId) throw new Error("conversationId or pageUrl is required");
    const res = await client.request<{ id?: string; messages?: ListResponse<MessageSummary> }>(
      `/${encodeURIComponent(input.conversationId)}`,
      { query: { fields: "messages" } },
    );
    return { id: res.id, messages: res.messages ?? { data: [] } };
  },
};

export default listConversationMessages;
