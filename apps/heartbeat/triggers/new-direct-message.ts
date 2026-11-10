import type { ActionDefinition, Param } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listDirectMessages from "../actions/list-direct-messages.ts";
import { idOf, listOf, newestFirst } from "../lib/triggers.ts";

const CHAT: Param = {
  key: "chatID",
  label: "Direct Chat ID",
  type: "string",
  required: true,
  hint:
    "The direct chat to watch (Create Direct Chat returns the id). Heartbeat only exposes chats that include an admin.",
};

/**
 * `GET /v0/directMessages/{chatID}` answers "the 100 most recent chat messages" of the chat as a
 * bare array (https://heartbeat.readme.io/reference/getdirectmessages) with no documented order
 * inside it, so `items` sorts it newest-first by each message's `createdAt` (kept as it came when
 * any message lacks one). One page, no cursor: more than 100 new messages between two checks lose
 * the oldest of them (the vendor exposes nothing older).
 */
export default pollFromListAction<{ chatID?: string }>({
  key: "new-direct-message",
  title: "New Direct Message in Chat",
  description:
    "The run gets each new message in one direct chat that includes an admin (the 100 most recent are checked).",
  action: listDirectMessages as unknown as ActionDefinition,
  params: [CHAT],
  input: (p) => ({ chatID: String(p.chatID ?? "").trim() }),
  items: (result) => newestFirst(listOf(result, "messages")),
  idOf,
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "userID", type: "string", label: "Sender user ID" },
    { key: "content", type: "string", label: "Message (restricted HTML)" },
    { key: "images", type: "array", label: "Image URLs" },
    { key: "files", type: "array", label: "File URLs" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "5dbcf5c9-5e7e-4285-9dab-6d3ce7f4dd1e",
    userID: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601",
    content: "<p>Hi, can you add me to the beta group?</p>",
    images: [],
    files: [],
    createdAt: "2026-11-10T09:30:00.000Z",
  },
  maxPages: 1,
});
