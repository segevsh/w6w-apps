import conversationList from "../actions/conversation-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/** `GET /v1/conversations` takes `createdAfter`; maxResults is capped at 100. */
export default sinceTrigger({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each newly created shared-inbox conversation.",
  action: conversationList,
  pageSize: 100,
  input: ({ since }) => ({ createdAfter: since, maxResults: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  nextPageInput: (input, result) => {
    const token = (result as { nextPageToken?: string | null }).nextPageToken;
    return token ? { ...input, pageToken: token } : undefined;
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => (item as { createdAt?: unknown }).createdAt,
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "phoneNumberId", type: "string", label: "Phone number ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "CN123abc",
    name: "Jane Doe",
    phoneNumberId: "PN123abc",
    createdAt: "2026-11-10T09:00:00Z",
    updatedAt: "2026-11-10T09:00:00Z",
  },
});
