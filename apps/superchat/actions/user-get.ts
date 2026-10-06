import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  userId: string;
}

/** Fetch one user by ID. */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by ID.",
  params: [
    { "key": "userId", "label": "User ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/users/${seg(input.userId)}`);
  },
};

export default userGet;
