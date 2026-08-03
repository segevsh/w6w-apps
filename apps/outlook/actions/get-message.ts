import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, preferHeaders } from "../lib/client.ts";
import { bodyContentTypeParam } from "../lib/params.ts";

interface Input {
  messageId: string;
  select?: string[];
  bodyContentType?: string;
}

/**
 * `GET /me/messages/{id}` — one message, hydrated.
 *
 * https://learn.microsoft.com/en-us/graph/api/message-get
 *
 * The MIME form (`/$value`) is deliberately not exposed: it answers
 * `text/plain` rather than a JSON message resource, so it would need a
 * different return contract than every other action here.
 *
 * Requires `Mail.ReadBasic` at minimum.
 */
const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Fetch a single message by id.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint:
        "OData `$select`. Note that `internetMessageHeaders` and `uniqueBody` are returned only when explicitly selected.",
    },
    bodyContentTypeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "bodyPreview", type: "string", label: "Body preview" },
    { key: "from", type: "object", label: "From" },
    { key: "toRecipients", type: "array", label: "To recipients" },
    { key: "receivedDateTime", type: "string", label: "Received at" },
    { key: "isRead", type: "boolean", label: "Is read" },
    { key: "hasAttachments", type: "boolean", label: "Has attachments" },
    { key: "conversationId", type: "string", label: "Conversation ID" },
    { key: "webLink", type: "string", label: "Web link" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(`/me/messages/${encodeURIComponent(input.messageId)}`, {
      query: { $select: odataList(input.select) },
      headers: preferHeaders({ bodyContentType: input.bodyContentType }),
    });
  },
};

export default getMessage;
