import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, page } from "../lib/client.ts";

interface Input {
  limit?: number;
  next?: string;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List messages (emails) that are drafts, scheduled or sent, newest first.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum records per page (Mixmax paginates with `limit`/`next`).",
    },
    {
      key: "next",
      label: "Next cursor",
      type: "string",
      hint: "Opaque `next` cursor from a previous response.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "next", type: "string", label: "Next cursor" },
    { key: "hasNext", type: "boolean", label: "More results available" },
  ],

  async execute(input, ctx) {
    const r = await new MixmaxClient(ctx).request("GET", "/messages", {
      query: { limit: input.limit, next: input.next },
    });
    return page(r);
  },
};

export default messageList;
