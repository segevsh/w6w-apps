import conversationList from "../actions/conversation-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/** `GET /v1/conversations` takes `updatedAfter`; maxResults is capped at 100. */
export default sinceTrigger({
  key: "new-or-updated-conversation",
  title: "New or Updated Conversation",
  description: "The run gets each shared-inbox conversation when it is created or updated.",
  action: conversationList,
  pageSize: 100,
  input: ({ since }) => ({ updatedAfter: since, maxResults: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  nextPageInput: (input, result) => {
    const token = (result as { nextPageToken?: string | null }).nextPageToken;
    return token ? { ...input, pageToken: token } : undefined;
  },
  idOf: (item) => {
    const c = item as { id?: unknown; updatedAt?: unknown };
    return `${c.id ?? ""}:${c.updatedAt ?? ""}`;
  },
  stampOf: (item) => (item as { updatedAt?: unknown }).updatedAt,
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
    updatedAt: "2026-11-10T09:30:00Z",
  },
});
