import messageList from "../actions/message-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/**
 * `GET /v1/messages` takes `createdAfter`; maxResults is capped at 100. The endpoint is scoped to
 * one Quo number and 1-10 other parties, so both are trigger params.
 * https://www.quo.com/docs/mdx/api-reference/messages/list-messages (verified 2026-11-10)
 */
export default sinceTrigger({
  key: "new-message",
  title: "New Message",
  description: "The run gets each new text between one Quo number and the given participants.",
  action: messageList,
  pageSize: 100,
  params: [
    {
      key: "phoneNumberId",
      label: "Phone number ID",
      type: "string",
      required: true,
      placeholder: "PN123abc",
      hint: "The Quo number whose messages to watch.",
    },
    {
      key: "participants",
      label: "Participants",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "+15555555555" },
      hint: "1-10 phone numbers (E.164), excluding the Quo number.",
    },
  ],
  input: ({ since }, params) => ({
    phoneNumberId: params.phoneNumberId,
    participants: params.participants,
    createdAfter: since,
    maxResults: 100,
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  nextPageInput: (input, result) => {
    const token = (result as { nextPageToken?: string | null }).nextPageToken;
    return token ? { ...input, pageToken: token } : undefined;
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => (item as { createdAt?: unknown }).createdAt,
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "from", type: "string", label: "From" },
    { key: "to", type: "array", label: "To" },
    { key: "text", type: "string", label: "Text" },
    { key: "direction", type: "string", label: "Direction (incoming, outgoing)" },
    { key: "conversationId", type: "string", label: "Conversation ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "AC123abc",
    from: "+15555555555",
    to: ["+15556667777"],
    text: "Hello",
    direction: "incoming",
    conversationId: "CN123abc",
    createdAt: "2026-11-10T09:00:00Z",
  },
});
