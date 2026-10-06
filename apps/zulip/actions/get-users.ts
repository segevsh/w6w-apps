import type { ActionDefinition } from "@w6w/types";
import { intList, payload, ZulipClient } from "../lib/client.ts";

interface Input {
  user_ids?: unknown;
  include_custom_profile_fields?: boolean;
}

const getUsers: ActionDefinition<Input> = {
  key: "get-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List the active users of the organization (GET /users). Not paginated.",
  params: [
    {
      "key": "user_ids",
      "label": "User IDs",
      "type": "string",
      "hint": "Comma-separated; restrict to these users.",
    },
    {
      "key": "include_custom_profile_fields",
      "label": "Include custom profile fields",
      "type": "boolean",
    },
  ],
  output: [
    {
      "key": "members",
      "type": "array",
      "label": "Users",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("GET", "/users", {
      query: {
        client_gravatar: false,
        include_custom_profile_fields: input.include_custom_profile_fields,
        user_ids: intList(input.user_ids, "user_ids"),
      },
    });
    return payload(res);
  },
};

export default getUsers;
