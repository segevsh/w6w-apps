import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** GET /v1/users/me — get-self. */
const action: ActionDefinition<Input> = {
  key: "get-self",
  type: "read",
  resource: "user",
  title: "Get Self",
  description: "Retrieve your token's bot user.",
  output: [
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "name", "type": "object", "label": "Name" },
    { "key": "avatar_url", "type": "object", "label": "Avatar url" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "person", "type": "object", "label": "Person" },
    { "key": "bot", "type": "object", "label": "Bot" },
  ],
  params: [],

  execute(_input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/users/me`, {
      method: "GET",
    });
  },
};

export default action;
