import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  startCursor?: string;
  userId?: string;
}

/** GET /admin/v1/legal_holds — list-legal-holds. */
const action: ActionDefinition<Input> = {
  key: "admin-list-legal-holds",
  type: "read",
  resource: "admin",
  title: "Admin: List legal holds",
  description: "Admin: List legal holds. Requires an Enterprise organization bot token.",
  output: [{ "key": "legal_holds", "type": "array", "label": "Legal holds" }, {
    "key": "next_cursor",
    "type": "string",
    "label": "Next cursor",
  }],
  params: [{ "key": "startCursor", "label": "Start Cursor", "type": "string" }, {
    "key": "userId",
    "label": "User ID",
    "type": "string",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/legal_holds`, {
      method: "GET",
      admin: true,
      query: {
        "start_cursor": input.startCursor,
        "user_id": input.userId,
      },
    });
  },
};

export default action;
