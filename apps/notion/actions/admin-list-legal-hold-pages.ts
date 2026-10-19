import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  legalHoldId: string;
  spaceId: string;
  startCursor?: string;
}

/** GET /admin/v1/legal_holds/{legal_hold_id}/spaces/{space_id}/pages — list-legal-hold-pages. */
const action: ActionDefinition<Input> = {
  key: "admin-list-legal-hold-pages",
  type: "read",
  resource: "admin",
  title: "Admin: List pages on a legal hold",
  description: "Admin: List pages on a legal hold. Requires an Enterprise organization bot token.",
  output: [{ "key": "page_ids", "type": "array", "label": "Page ids" }, {
    "key": "next_cursor",
    "type": "string",
    "label": "Next cursor",
  }],
  params: [{
    "key": "legalHoldId",
    "label": "Legal Hold ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, { "key": "startCursor", "label": "Start Cursor", "type": "string" }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/legal_holds/${pathId(input.legalHoldId)}/spaces/${pathId(input.spaceId)}/pages`,
      {
        method: "GET",
        admin: true,
        query: {
          "start_cursor": input.startCursor,
        },
      },
    );
  },
};

export default action;
