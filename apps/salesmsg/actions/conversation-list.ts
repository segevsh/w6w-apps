import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /conversations` (scope `conversations:read`). `filter` and `limit` are required by the
 * document. Pagination is `limit`/`offset`; the answer is a bare array with no total.
 */
interface Input {
  filter: string;
  limit: number;
  offset?: number;
  query?: string;
  before?: string;
  after?: string;
}

const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "search",
  resource: "conversation",
  title: "List Conversations",
  description: "List conversations by status filter.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "select",
      required: true,
      hint: "`assigned` and `unassigned` only apply when the current user is on the team.",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "unread", label: "Unread" },
        { value: "assigned", label: "Assigned" },
        { value: "unassigned", label: "Unassigned" },
        { value: "outbound", label: "Outbound" },
        { value: "optout", label: "Optout" },
        { value: "nocalls", label: "Nocalls" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      required: true,
      hint: "How many conversations to return.",
      default: 25,
      validation: { integer: true, min: 1 },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Rows to skip.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Contact first name, last name, email or number.",
    },
    {
      key: "before",
      label: "Last message before",
      type: "string",
      hint: "Date, YYYY-MM-DD.",
    },
    {
      key: "after",
      label: "Last message after",
      type: "string",
      hint: "Date, YYYY-MM-DD.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "meta", type: "object", label: "Pagination block, when the vendor sends one" },
  ],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).items("/conversations", {
      query: {
        filter: input.filter,
        limit: input.limit,
        offset: input.offset,
        query: input.query,
        before: input.before,
        after: input.after,
      },
    });
  },
};

export default conversationList;
