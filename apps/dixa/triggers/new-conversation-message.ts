import type { Param } from "@w6w/types";
import { idOf, snapshotTrigger } from "../lib/triggers.ts";
import messageList from "../actions/message-list.ts";
import { conversationIdParam } from "../lib/params.ts";

/**
 * Per-parent bounded collection (brief 9.1 c): `GET /v1/conversations/{conversationId}/messages`
 * returns one conversation's messages in a single response, with no documented order or filter
 * (https://docs.dixa.io/openapi/dixa-api/v1/ , verified 2026-11-10), so the whole list is compared.
 */
export default snapshotTrigger<{ conversationId: number | string }>({
  key: "new-conversation-message",
  title: "New Conversation Message",
  description: "The run gets each message newly added to one Dixa conversation.",
  params: [conversationIdParam as Param],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "authorId", type: "string", label: "Author ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "attributes", type: "object", label: "Channel-specific attributes" },
  ],
  sample: {
    id: "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d",
    authorId: "9e4b2a0c-5f3d-4a8e-b6c1-7d2f0a1b3c4d",
    createdAt: "2026-11-09T10:00:00Z",
    attributes: { _type: "EmailAttributes" },
  },
  fetchRows: async (params, ctx) => {
    const out = await messageList.execute({ conversationId: params.conversationId }, ctx) as {
      data?: unknown[];
    };
    return out.data ?? [];
  },
  idOf,
});
