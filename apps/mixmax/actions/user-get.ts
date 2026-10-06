import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient } from "../lib/client.ts";

type Input = Record<string, never>;

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Return the id of the user that owns the API token (`GET /users/me`).",
  params: [],
  output: [{ key: "userId", type: "string", label: "User ID" }],

  async execute(_input, ctx) {
    const r = await new MixmaxClient(ctx).request<{ _id?: string }>("GET", "/users/me");
    return { userId: r._id };
  },
};

export default userGet;
