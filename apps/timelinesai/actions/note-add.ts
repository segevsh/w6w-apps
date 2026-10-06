import type { ActionDefinition } from "@w6w/types";
import { compact, seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  chatId: number;
  text: string;
  isPrivate?: boolean;
}

const noteAdd: ActionDefinition<Input> = {
  key: "note-add",
  type: "perform",
  idempotent: false,
  resource: "chat",
  title: "Add Note to Chat",
  description:
    "Add an internal note to a chat; nothing is sent to the contact (POST /chats/{chat_id}/notes).",
  params: [
    {
      "key": "chatId",
      "label": "Chat ID",
      "type": "number",
      "required": true,
      "hint":
        "The numeric chat id — from List Chats, the chat's URL in TimelinesAI, or a webhook payload.",
    },
    {
      "key": "text",
      "label": "Note",
      "type": "text",
      "required": true,
      "hint": "The note text.",
    },
    {
      "key": "isPrivate",
      "label": "Private",
      "type": "boolean",
      "hint": "Whether the note is private to you.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "message_uid of the note" },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).post(
      `/chats/${seg(input.chatId)}/notes`,
      compact({
        text: input.text,
        is_private: input.isPrivate,
      }),
    );
  },
};

export default noteAdd;
