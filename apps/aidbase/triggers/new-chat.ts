import type { ActionDefinition } from "@w6w/types";
import chatbotChatList from "../actions/chatbot-chat-list.ts";
import { pickParams, windowTrigger } from "../lib/triggers.ts";

const action = chatbotChatList as unknown as ActionDefinition;

export default windowTrigger({
  key: "new-chat",
  title: "New Chat",
  description:
    "The run gets each chat a chatbot starts, polled through chatbot-chat-list with the documented created_after filter.",
  action,
  params: pickParams(action, ["chatbotId"]),
  output: [
    { key: "id", type: "string", label: "Chat ID" },
    { key: "session_id", type: "string", label: "Session ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "c3a9b7e5-8f42-4d1a-9c3e-7f8a6b5c4d3e",
    session_id: "sample-session",
    created_at: "2026-11-09T10:30:00.000Z",
    updated_at: "2026-11-09T10:35:00.000Z",
  },
});
