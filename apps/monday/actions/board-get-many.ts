import type { ActionDefinition } from "@w6w/types";
import { BOARD_FIELDS, MondayClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  page?: number;
}

/** monday paginates boards with 1-based page numbers, not cursors. */
const QUERY = `
  query GetBoards($page: Int, $limit: Int) {
    boards(page: $page, limit: $limit) {
      ${BOARD_FIELDS}
    }
  }
`;

const boardGetMany: ActionDefinition<Input> = {
  key: "board-get-many",
  type: "search",
  resource: "board",
  title: "List Boards",
  description: "List boards, page by page.",
  params: [
    {
      key: "limit",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 100, integer: true },
      hint: "monday caps this at 100.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
      hint: "1-based page number.",
    },
  ],
  output: [{ key: "boards", type: "array", label: "Boards" }],

  execute(input, ctx) {
    return new MondayClient(ctx).query(QUERY, {
      page: input.page ?? 1,
      limit: input.limit ?? 50,
    });
  },
};

export default boardGetMany;
