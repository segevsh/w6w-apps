import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listChatMessages from "../actions/list-chat-messages.ts";
import { TEAMS_MIN_INTERVAL_MS } from "../lib/triggers.ts";

interface Params {
  chatId: string;
}

/**
 * `GET /chats/{chat-id}/messages?$orderby=lastModifiedDateTime desc&$top=50` — the same request as
 * List Chat Messages. `lastModifiedDateTime` descending is Graph's documented default order, and
 * `$top` is at most 50 (https://learn.microsoft.com/en-us/graph/api/chat-list-messages, verified
 * 2026-11-10). The event id carries the modified time, so an edited message is a new event.
 */
export default pollFromListAction<Params>({
  key: "new-or-updated-chat-message",
  title: "New or Updated Chat Message",
  description:
    "Fires for each new or edited message in a Teams chat. The run gets the message's id, sender, text, type and times.",
  action: listChatMessages as unknown as ActionDefinition,
  input: ({ chatId }) => ({ chatId, orderby: "lastModifiedDateTime desc", top: 50, all: false }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => {
    const m = item as { id?: unknown; lastModifiedDateTime?: unknown };
    return `${String(m.id ?? "")}:${String(m.lastModifiedDateTime ?? "")}`;
  },
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
    lastModifiedDateTime: "2026-11-09T12:05:00Z",
    messageType: "message",
    from: { user: { id: "user-1", displayName: "Boss" } },
    body: { contentType: "text", content: "Hello (edited)" },
  },
  maxPages: 1,
  minIntervalMs: TEAMS_MIN_INTERVAL_MS,
});
