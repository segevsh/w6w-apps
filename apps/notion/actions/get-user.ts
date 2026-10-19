import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  userId: string;
}

/** GET /v1/users/{user_id} — get-user. */
const action: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a user.",
  output: [
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "name", "type": "object", "label": "Name" },
    { "key": "avatar_url", "type": "object", "label": "Avatar url" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "person", "type": "object", "label": "Person" },
    { "key": "bot", "type": "object", "label": "Bot" },
  ],
  params: [{
    "key": "userId",
    "label": "User ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the user or bot to retrieve.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/users/${pathId(input.userId)}`, {
      method: "GET",
    });
  },
};

export default action;
