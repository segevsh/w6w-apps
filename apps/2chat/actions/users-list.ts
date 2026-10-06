import type { ActionDefinition } from "@w6w/types";
import { TwoChatClient } from "../lib/client.ts";

type Input = Record<string, never>;

const usersList: ActionDefinition<Input> = {
  key: "users-list",
  type: "read",
  resource: "user",
  title: "List Account Users",
  description:
    "List the active users on the 2Chat account (GET /users). Pending, suspended and deleted users " +
    "are filtered out by 2Chat.",
  params: [],
  output: [
    { key: "data", type: "object", label: "{ users: [{ uuid, first_name, last_name, email }] }" },
  ],

  execute(_input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get("/users");
  },
};

export default usersList;
