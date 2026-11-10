import type { TriggerDefinition } from "@w6w/types";
import { checkNewChat, TEAMS_MIN_INTERVAL_MS } from "../lib/triggers.ts";

/**
 * `GET /me/chats?$orderby=lastMessagePreview/createdDateTime desc&$top=50` — the same request as
 * List Chats; `$orderby` and the 50-per-page `$top` limit are in
 * https://learn.microsoft.com/en-us/graph/api/chat-list (verified 2026-11-10).
 */
const newChat: TriggerDefinition<Record<string, never>> = {
  key: "new-chat",
  title: "New Chat",
  description:
    "Fires when a new chat (one-on-one, group or meeting chat) that includes the signed-in user is created and has its first message. The run gets the chat's id, type, topic and creation time.",
  output: [
    { key: "id", type: "string", label: "Chat ID" },
    { key: "chatType", type: "string", label: "Type (oneOnOne, group, meeting)" },
    { key: "topic", type: "string", label: "Topic" },
    { key: "createdDateTime", type: "string", label: "Created at" },
    { key: "webUrl", type: "string", label: "Link" },
  ],
  sample: {
    id: "19:2da4c29f6d7041eca70b638b43d45437@thread.v2",
    chatType: "group",
    topic: "Launch planning",
    createdDateTime: "2026-11-09T12:00:00Z",
    webUrl:
      "https://teams.microsoft.com/l/chat/19%3A2da4c29f6d7041eca70b638b43d45437%40thread.v2/0",
  },
  minIntervalMs: TEAMS_MIN_INTERVAL_MS,
  poll({ state }, ctx) {
    return checkNewChat(state, ctx);
  },
};

export default newChat;
