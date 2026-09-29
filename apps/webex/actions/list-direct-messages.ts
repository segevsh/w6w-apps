import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  personId?: string;
  personEmail?: string;
  parentId?: string;
}

const listDirectMessages: ActionDefinition<Input> = {
  key: "list-direct-messages",
  type: "read",
  resource: "message",
  title: "List Direct Messages",
  description: "List the messages in a 1:1 room, by the other person's ID or email — without " +
    "needing the room ID.",
  params: [
    {
      key: "personId",
      label: "Person ID",
      type: "string",
      hint: "One of Person ID or Person email is required.",
    },
    { key: "personEmail", label: "Person email", type: "string" },
    {
      key: "parentId",
      label: "Parent message ID",
      type: "string",
      hint: "List a thread's replies.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "text", type: "string", label: "Text" },
  ],

  async execute(input, ctx) {
    const client = new WebexClient(ctx);
    const res = await client.request<{ items: unknown[] }>("/messages/direct", {
      query: {
        personId: unset(input.personId),
        personEmail: unset(input.personEmail),
        parentId: unset(input.parentId),
      },
    });
    return res.items ?? [];
  },
};

export default listDirectMessages;
