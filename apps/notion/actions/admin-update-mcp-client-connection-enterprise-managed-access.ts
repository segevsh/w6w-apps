import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  access: "allowed" | "denied";
  userId: string;
  workspaceId: string;
}

/** PUT /admin/v1/mcp_client_connections/enterprise_managed_access — update-mcp-client-connection-enterprise-managed-access. */
const action: ActionDefinition<Input> = {
  key: "admin-update-mcp-client-connection-enterprise-managed-access",
  type: "perform",
  resource: "admin",
  title: "Admin: Deny or restore enterprise-managed MCP client access",
  description:
    "Admin: Deny or restore enterprise-managed MCP client access. Requires an Enterprise organization bot token.",
  output: [{ "key": "access", "type": "string", "label": "Access" }, {
    "key": "revoked_token_count",
    "type": "number",
    "label": "Revoked token count",
  }],
  idempotent: false,
  params: [
    {
      "key": "access",
      "label": "Access",
      "type": "select",
      "required": true,
      "options": [{ "value": "allowed", "label": "allowed" }, {
        "value": "denied",
        "label": "denied",
      }],
      "hint": "'denied' blocks access; 'allowed' restores access.",
    },
    { "key": "userId", "label": "User ID", "type": "string", "required": true },
    { "key": "workspaceId", "label": "Workspace ID", "type": "string", "required": true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/mcp_client_connections/enterprise_managed_access`, {
      method: "PUT",
      admin: true,
      body: {
        "access": input.access,
        "user_id": input.userId,
        "workspace_id": input.workspaceId,
      },
    });
  },
};

export default action;
