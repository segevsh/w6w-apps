import type { ActionDefinition } from "@w6w/types";
import { toList, WebexClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  parentId?: string;
  mentionedPeople?: string;
  before?: string;
  beforeMessage?: string;
  max?: number;
}

const listMessages: ActionDefinition<Input> = {
  key: "list-messages",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List messages in a room, most recent first.",
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
    {
      key: "parentId",
      label: "Parent message ID",
      type: "string",
      hint: "List a thread's replies.",
    },
    {
      key: "mentionedPeople",
      label: "Mentioned people",
      type: "string",
      hint: 'Comma-separated person IDs, or "me" for the connected user. Bots must set this to ' +
        "list messages in a group room.",
    },
    { key: "before", label: "Before (ISO 8601)", type: "string" },
    { key: "beforeMessage", label: "Before message ID", type: "string" },
    {
      key: "max",
      label: "Max results",
      type: "number",
      default: 50,
      hint: "Cannot exceed 100 when Mentioned people is set.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "personId", type: "string", label: "Author person ID" },
  ],

  async execute(input, ctx) {
    const client = new WebexClient(ctx);
    const res = await client.request<{ items: unknown[] }>("/messages", {
      query: {
        roomId: input.roomId,
        parentId: input.parentId,
        mentionedPeople: toList(input.mentionedPeople),
        before: input.before,
        beforeMessage: input.beforeMessage,
        max: input.max,
      },
    });
    return res.items ?? [];
  },
};

export default listMessages;
