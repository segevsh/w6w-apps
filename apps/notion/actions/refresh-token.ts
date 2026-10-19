import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  refreshToken: string;
}

/** POST /v1/oauth/token — create-a-token. */
const action: ActionDefinition<Input> = {
  key: "refresh-token",
  type: "perform",
  resource: "oauth",
  title: "Refresh Token",
  description:
    "Exchange an authorization code for an access and refresh token. Requires an OAuth Client connection (client ID and client secret).",
  output: [
    { "key": "access_token", "type": "string", "label": "Access token" },
    { "key": "token_type", "type": "string", "label": "Token type" },
    { "key": "refresh_token", "type": "string", "label": "Refresh token" },
    { "key": "bot_id", "type": "string", "label": "Bot id" },
    { "key": "workspace_icon", "type": "string", "label": "Workspace icon" },
    { "key": "workspace_name", "type": "string", "label": "Workspace name" },
    { "key": "workspace_id", "type": "string", "label": "Workspace id" },
    { "key": "owner", "type": "object", "label": "Owner" },
    { "key": "duplicated_template_id", "type": "string", "label": "Duplicated template id" },
    { "key": "request_id", "type": "string", "label": "Request id" },
  ],
  idempotent: false,
  params: [{ key: "refreshToken", label: "Refresh Token", type: "secret", required: true }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/oauth/token`, {
      method: "POST",
      body: {
        "grant_type": "refresh_token",
        "refresh_token": input.refreshToken,
      },
    });
  },
};

export default action;
