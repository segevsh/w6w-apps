import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient } from "../lib/client.ts";

type Input = Record<string, never>;

const getCurrentUser: ActionDefinition<Input> = {
  key: "get-current-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Read the user the credential belongs to (GET /v4/users/me): id, name, role, team and settings.",
  params: [],
  output: [
    { key: "data", type: "object", label: "The authenticated user" },
  ],

  async execute(_input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v4/users/me");
    return { data: body.data ?? null };
  },
};

export default getCurrentUser;
