import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  spaceId: string;
  startCursor?: string;
  cursor?: string;
  pageSize?: string;
  status?: string | string[];
  creatorIds?: string | string[];
  search?: string;
}

/** GET /admin/v1/spaces/{space_id}/personal_access_tokens — list-personal-access-tokens. */
const action: ActionDefinition<Input> = {
  key: "admin-list-personal-access-tokens",
  type: "read",
  resource: "admin",
  title: "Admin: List personal access tokens in a workspace",
  description:
    "Admin: List personal access tokens in a workspace. Requires an Enterprise organization bot token.",
  output: [{ "key": "results", "type": "array", "label": "Results" }, {
    "key": "has_more",
    "type": "boolean",
    "label": "Has more",
  }, { "key": "next_cursor", "type": "string", "label": "Next cursor" }],
  params: [{
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint": "The `next_cursor` returned by the previous page.",
  }, {
    "key": "cursor",
    "label": "Cursor",
    "type": "string",
    "hint": "Deprecated; use `start_cursor`.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "string",
    "hint":
      "Number of results to return. Defaults to 100 and cannot exceed 100. Number of results per page (1–100).",
  }, {
    "key": "status",
    "label": "Status",
    "type": "json",
    "hint": "Token statuses to include. Use bracket encoding for multiple values.",
  }, {
    "key": "creatorIds",
    "label": "Creator IDS",
    "type": "json",
    "hint": "IDs of members who created the tokens. Use bracket encoding for multiple values.",
  }, {
    "key": "search",
    "label": "Search",
    "type": "string",
    "hint": "Case-insensitive text to match against the token name.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/personal_access_tokens`, {
      method: "GET",
      admin: true,
      query: {
        "start_cursor": input.startCursor,
        "cursor": input.cursor,
        "page_size": input.pageSize,
        "status": input.status,
        "creator_ids": input.creatorIds,
        "search": input.search,
      },
    });
  },
};

export default action;
