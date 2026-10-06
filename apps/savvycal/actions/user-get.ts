import type { ActionDefinition } from "@w6w/types";
import { SavvyCalClient } from "../lib/client.ts";

const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "The authenticated user's profile: id, name, email, time zone, time format, first day of " +
    "week, plan (free / basic / premium) and avatar.",
  params: [],
  output: [{ key: "id", type: "string", label: "User ID" }],

  execute(_input, ctx) {
    return new SavvyCalClient(ctx).json("/me");
  },
};

export default userGet;
