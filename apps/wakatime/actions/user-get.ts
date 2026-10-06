import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1USER` */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Read the authenticated user's profile: id, username, display name, email, timezone, plan and privacy settings.",
  params: [],
  output: [
    {
      key: "data",
      type: "object",
      label: "User (id, username, display_name, email, timezone, ...)",
    },
  ],

  execute(_input, ctx) {
    return new WakaClient(ctx).request("GET", USER);
  },
};

export default userGet;
