import type { ActionDefinition } from "@w6w/types";
import { MondayClient } from "../lib/client.ts";

const QUERY = `
  query GetColumns($ids: [ID!]) {
    boards(ids: $ids) {
      id
      columns {
        id
        title
        type
        settings_str
        archived
      }
    }
  }
`;

/**
 * Columns belong to a board. Their `id` (e.g. `status`, `text8`) is the key the
 * column-value mutations write against, so this is how you discover what to put
 * in `columnValues`.
 */
const columnGetMany: ActionDefinition<{ boardId: string }> = {
  key: "column-get-many",
  type: "search",
  resource: "column",
  title: "List Columns",
  description:
    "List a board's columns with their ids and types — the keys column-value writes need.",
  params: [
    { key: "boardId", label: "Board ID", type: "string", required: true },
  ],
  output: [{ key: "boards", type: "array", label: "Boards, each with `columns`" }],

  execute(input, ctx) {
    return new MondayClient(ctx).query(QUERY, { ids: [input.boardId] });
  },
};

export default columnGetMany;
