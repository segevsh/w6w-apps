import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listChatMessages from "../actions/list-chat-messages.ts";
import { TEAMS_MIN_INTERVAL_MS } from "../lib/triggers.ts";

interface Params {
  chatId: string;
}

/**
 * `GET /chats/{chat-id}/messages?$orderby=createdDateTime desc&$top=50` — the same request as
 * List Chat Messages. Graph supports `createdDateTime` descending and a `$top` of at most 50
 * (https://learn.microsoft.com/en-us/graph/api/chat-list-messages, verified 2026-11-10).
 */
export default pollFromListAction<Params>({
  key: "new-chat-message",
  title: "New Chat Message",
  description:
    "Fires for each new message in a Teams chat. The run gets the message's id, sender, text, type and times.",
  action: listChatMessages as unknown as ActionDefinition,
  input: ({ chatId }) => ({ chatId, orderby: "createdDateTime desc", top: 50, all: false }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [
    {
      key: "chatId",
      label: "Chat ID",
      type: "string",
      required: true,
      hint: "From List Chats, e.g. 19:…@thread.v2.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "createdDateTime", type: "string", label: "Created at" },
    { key: "lastModifiedDateTime", type: "string", label: "Last modified at" },
    { key: "from.user.displayName", type: "string", label: "Sender" },
    { key: "body.content", type: "string", label: "Message" },
    { key: "messageType", type: "string", label: "Message type" },
  ],
  sample: {
    id: "1731153600000",
    createdDateTime: "2026-11-09T12:00:00Z",
    lastModifiedDateTime: "2026-11-09T12:00:00Z",
    messageType: "message",
    from: { user: { id: "user-1", displayName: "Boss" } },
    body: { contentType: "text", content: "Hello" },
  },
  maxPages: 1,
  minIntervalMs: TEAMS_MIN_INTERVAL_MS,
});
