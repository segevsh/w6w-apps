import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient } from "../lib/client.ts";

/** `GET /api/client/v2/oauth/me` — Get Authenticated User. */
type Input = Record<string, never>;

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "account",
  title: "Get Authenticated User",
  description: "The user the API key belongs to: email and name.",
  params: [],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
  ],

  async execute(_input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/oauth/me");
  },
};

export default userGet;
