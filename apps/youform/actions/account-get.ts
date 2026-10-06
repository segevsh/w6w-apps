import type { ActionDefinition } from "@w6w/types";
import { YouformClient } from "../lib/client.ts";

/** `GET /api/me` — the profile of the user who owns the API token. */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get account",
  description: "Get the profile (id, name, email) of the user the API token belongs to.",
  params: [],
  output: [{ key: "data", type: "object", label: "Profile: id, first_name, last_name, email" }],

  execute(_input, ctx) {
    return new YouformClient(ctx).json("/me");
  },
};

export default accountGet;
