import type { ActionDefinition } from "@w6w/types";
import { csv, ITEM_FIELDS, MondayClient } from "../lib/client.ts";

interface Input {
  boardId: string;
  groupId?: string;
  limit?: number;
}

/**
 * Items are read through a board's `items_page`, which returns a `cursor` for
 * the next page alongside the items. Filtering by group narrows to that group.
 */
const QUERY = `
  query GetItems($boardId: [ID!], $groupId: [String], $limit: Int) {
    boards(ids: $boardId) {
      id
      groups(ids: $groupId) {
        id
        items_page(limit: $limit) {
          cursor
          items {
            ${ITEM_FIELDS}
          }
        }
      }
    }
  }
`;

const itemGetMany: ActionDefinition<Input> = {
  key: "item-get-many",
  type: "search",
  resource: "item",
  title: "List Items",
  description:
    "List items on a board, optionally within one group. Returns a page with a `cursor` for the next.",
  params: [
    { key: "boardId", label: "Board ID", type: "string", required: true },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "Optional. Restrict to one group.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 500, integer: true },
      hint: "monday caps items_page at 500.",
    },
  ],
  output: [{ key: "boards", type: "array", label: "Boards, each with grouped items_page" }],

  execute(input, ctx) {
    return new MondayClient(ctx).query(QUERY, {
      boardId: [input.boardId],
      groupId: csv(input.groupId),
      limit: input.limit ?? 50,
    });
  },
};

export default itemGetMany;
