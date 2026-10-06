import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after?: string;
  before?: string;
}

/** List uploaded files, newest first, one cursor page at a time. */
const fileList: ActionDefinition<Input> = {
  key: "file-list",
  type: "read",
  resource: "file",
  title: "List Files",
  description: "List uploaded files, newest first, one cursor page at a time.",
  params: [
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Page size, 1-100.",
      "default": 50,
      "validation": { "min": 1, "max": 100, "integer": true },
    },
    {
      "key": "after",
      "label": "After",
      "type": "string",
      "hint": "Cursor: pass the previous page's `nextCursor` to get the next page.",
    },
    {
      "key": "before",
      "label": "Before",
      "type": "string",
      "hint":
        "Cursor for paging backwards (the previous page's `previous_cursor`). Use either After or Before, not both.",
    },
  ],
  output: [
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "nextCursor", "type": "string", "label": "Next page cursor (null on the last page)" },
    { "key": "pagination", "type": "object", "label": "Pagination cursors and URLs" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).list("/files", input);
  },
};

export default fileList;
