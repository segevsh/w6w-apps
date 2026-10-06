import type { ActionDefinition } from "@w6w/types";
import { payload, ZulipClient } from "../lib/client.ts";

interface Input {
  [key: string]: never;
}

const getOwnUser: ActionDefinition<Input> = {
  key: "get-own-user",
  type: "read",
  resource: "user",
  title: "Get Own User",
  description:
    "Fetch the profile of the user or bot the connection signs in as (GET /users/me). It does not include the API key.",
  params: [],
  output: [
    {
      "key": "user_id",
      "type": "number",
      "label": "User ID",
    },
    {
      "key": "email",
      "type": "string",
      "label": "API email",
    },
    {
      "key": "full_name",
      "type": "string",
      "label": "Display name",
    },
    {
      "key": "role",
      "type": "number",
      "label": "Role code",
    },
    {
      "key": "is_bot",
      "type": "boolean",
      "label": "Whether this is a bot",
    },
  ],

  async execute(_input, ctx) {
    const res = await new ZulipClient(ctx).request("GET", "/users/me");
    return payload(res);
  },
};

export default getOwnUser;
