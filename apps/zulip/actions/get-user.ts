import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  user_id: number;
  include_custom_profile_fields?: boolean;
}

const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by ID (GET /users/{user_id}).",
  params: [
    {
      "key": "user_id",
      "label": "User ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "include_custom_profile_fields",
      "label": "Include custom profile fields",
      "type": "boolean",
    },
  ],
  output: [
    {
      "key": "user",
      "type": "object",
      "label": "The user",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("GET", `/users/${seg(input.user_id)}`, {
      query: {
        client_gravatar: false,
        include_custom_profile_fields: input.include_custom_profile_fields,
      },
    });
    return payload(res);
  },
};

export default getUser;
