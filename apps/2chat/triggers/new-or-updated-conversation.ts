import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import conversationsList from "../actions/conversations-list.ts";

export default pollFromListAction<{ channelUuid: string }>({
  key: "new-or-updated-conversation",
  title: "New or Active WhatsApp Conversation",
  description:
    "The run gets each conversation that is new or has had new activity since the last check.",
  action: conversationsList as unknown as ActionDefinition,
  input: (p) => ({ channelUuid: p.channelUuid, pageNumber: 0 }),
  nextPageInput: (input) => ({ ...input, pageNumber: Number(input.pageNumber ?? 0) + 1 }),
  items: (result) => (result as { sessions?: unknown[] }).sessions ?? [],
  idOf: (item) => {
    const s = item as { session_key?: unknown; last_activity_at?: unknown };
    return `${s.session_key ?? ""}:${s.last_activity_at ?? ""}`;
  },
  params: [{
    key: "channelUuid",
    label: "Channel UUID",
    type: "string",
    required: true,
    hint: "The connected WhatsApp number's UUID (WPN...), from List WhatsApp Numbers.",
  }],
  output: [
    { key: "session_key", type: "string", label: "Conversation (session) key" },
    { key: "phone_number", type: "string", label: "Contact phone number" },
    { key: "channel_uuid", type: "string", label: "Channel UUID" },
    { key: "is_group_chat", type: "boolean", label: "Is a group chat" },
    { key: "last_activity_at", type: "string", label: "Last activity" },
    { key: "created_at", type: "string", label: "Created" },
  ],
  sample: {
    session_key: "WW-WPN582e4db7-6391-4e58-b79e-1b92e93a8374-5255512345678@c.us",
    phone_number: "+5255512345678",
    channel_uuid: "WPN582e4db7-6391-4e58-b79e-1b92e93a8374",
    is_group_chat: false,
    last_activity_at: "2024-10-22T01:37:23Z",
    created_at: "2024-10-22T01:06:36Z",
  },
  maxPages: 3,
});
