import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  userId: number;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by id.",
  params: [
    idParam("userId", "User ID"),
  ],
  output: [
    { key: "data", type: "object", label: "The user" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/users/${encodeId(input.userId)}`);
  },
};

export default userGet;
