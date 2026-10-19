import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  clientKey: string;
  userId: string;
  workspaceId: string;
}

/** POST /admin/v1/mcp_client_connections/revoke — revoke-mcp-client-connection. */
const action: ActionDefinition<Input> = {
  key: "admin-revoke-mcp-client-connection",
  type: "perform",
  resource: "admin",
  title: "Admin: Revoke an MCP client connection",
  description:
    "Admin: Revoke an MCP client connection. Requires an Enterprise organization bot token.",
  output: [{ "key": "revoked_token_count", "type": "number", "label": "Revoked token count" }],
  idempotent: false,
  params: [
    {
      "key": "clientKey",
      "label": "Client Key",
      "type": "string",
      "required": true,
      "hint": "Stable client key returned by the list endpoint.",
    },
    { "key": "userId", "label": "User ID", "type": "string", "required": true },
    { "key": "workspaceId", "label": "Workspace ID", "type": "string", "required": true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/mcp_client_connections/revoke`, {
      method: "POST",
      admin: true,
      body: {
        "client_key": input.clientKey,
        "user_id": input.userId,
        "workspace_id": input.workspaceId,
      },
    });
  },
};

export default action;
