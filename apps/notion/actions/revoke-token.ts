import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  token: string;
}

/** POST /v1/oauth/revoke — revoke-token. */
const action: ActionDefinition<Input> = {
  key: "revoke-token",
  type: "perform",
  resource: "oauth",
  title: "Revoke Token",
  description: "Revoke a token. Requires an OAuth Client connection (client ID and client secret).",
  output: [{ "key": "request_id", "type": "string", "label": "Request id" }],
  idempotent: false,
  params: [{ "key": "token", "label": "Token", "type": "secret", "required": true }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/oauth/revoke`, {
      method: "POST",
      body: {
        "token": input.token,
      },
    });
  },
};

export default action;
