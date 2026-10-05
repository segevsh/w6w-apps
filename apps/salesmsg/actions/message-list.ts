import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /messages/{conversation}/paginated` (scope `messages:read`). Answers `{data, meta}`; `meta`
 * is Laravel's (`current_page`, `last_page`, `per_page`, `total`). The unpaginated `GET
 * /messages/{conversation}` is not used.
 */
interface Input {
  conversation: number;
  page: number;
  per_page: number;
  only_scheduled?: boolean;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List the messages of a conversation, page by page.",
  params: [
    {
      key: "conversation",
      label: "Conversation ID",
      type: "number",
      required: true,
      hint: "The conversation ID.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      required: true,
      hint: "Page number, starting at 1.",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      required: true,
      hint: "Messages per page.",
      default: 15,
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "only_scheduled",
      label: "Only scheduled",
      type: "boolean",
      hint: "Only messages still waiting to be sent.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "meta", type: "object", label: "Pagination block, when the vendor sends one" },
  ],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).items(
      `/messages/${encodePathSegment(input.conversation)}/paginated`,
      {
        query: {
          page: input.page,
          per_page: input.per_page,
          only_scheduled: input.only_scheduled,
        },
      },
    );
  },
};

export default messageList;
