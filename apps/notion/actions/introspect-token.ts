import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  token: string;
}

/** POST /v1/oauth/introspect — introspect-token. */
const action: ActionDefinition<Input> = {
  key: "introspect-token",
  type: "perform",
  resource: "oauth",
  title: "Introspect Token",
  description:
    "Introspect a token. Requires an OAuth Client connection (client ID and client secret).",
  output: [
    { "key": "active", "type": "boolean", "label": "Active" },
    { "key": "scope", "type": "string", "label": "Scope" },
    { "key": "iat", "type": "number", "label": "Iat" },
    { "key": "request_id", "type": "string", "label": "Request id" },
  ],
  idempotent: false,
  params: [{ "key": "token", "label": "Token", "type": "secret", "required": true }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/oauth/introspect`, {
      method: "POST",
      body: {
        "token": input.token,
      },
    });
  },
};

export default action;
