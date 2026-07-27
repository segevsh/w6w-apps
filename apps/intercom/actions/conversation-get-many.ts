import type { ActionDefinition } from "@w6w/types";
import { IntercomClient } from "../lib/client.ts";

interface Input {
  perPage?: number;
  startingAfter?: string;
}

/**
 * GET /conversations — list all conversations, newest first. Uses cursor
 * pagination: pass `pages.next.starting_after` from one page back as
 * `startingAfter` to get the next.
 */
const conversationGetMany: ActionDefinition<Input> = {
  key: "conversation-get-many",
  type: "search",
  resource: "conversation",
  title: "List Conversations",
  description: "List conversations for the workspace. Uses cursor pagination.",
  params: [
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 20,
      validation: { min: 1, max: 150, integer: true },
      hint: "Intercom caps this at 150.",
    },
    {
      key: "startingAfter",
      label: "Starting after cursor",
      type: "string",
      advanced: true,
      hint: "`pages.next.starting_after` from the previous page.",
    },
  ],
  output: [
    { key: "conversations", type: "array", label: "Conversations" },
    { key: "pages", type: "object", label: "Pagination" },
    { key: "total_count", type: "number", label: "Total count" },
  ],

  execute(input, ctx) {
    return new IntercomClient(ctx).request("/conversations", {
      query: {
        per_page: input.perPage ?? 20,
        starting_after: input.startingAfter,
      },
    });
  },
};

export default conversationGetMany;
