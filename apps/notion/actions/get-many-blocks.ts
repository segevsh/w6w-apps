import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  blockId: string;
  startCursor?: string;
  pageSize?: number;
}

/** GET /v1/blocks/{block_id}/children — get-block-children. */
const action: ActionDefinition<Input> = {
  key: "get-many-blocks",
  type: "read",
  resource: "block",
  title: "Get Many Blocks",
  description: "Retrieve block children.",
  output: [
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "block", "type": "object", "label": "Block" },
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "next_cursor", "type": "string", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
  ],
  params: [
    {
      "key": "blockId",
      "label": "Block ID",
      "type": "string",
      "required": true,
      "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
    },
    { "key": "startCursor", "label": "Start Cursor", "type": "string" },
    {
      "key": "pageSize",
      "label": "Page Size",
      "type": "number",
      "hint": "Number of results per page (1–100).",
      "validation": { "min": 1, "max": 100 },
    },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/blocks/${pathId(input.blockId)}/children`, {
      method: "GET",
      query: {
        "start_cursor": input.startCursor,
        "page_size": input.pageSize ?? 100,
      },
    });
  },
};

export default action;
