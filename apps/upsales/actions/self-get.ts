import type { ActionDefinition } from "@w6w/types";
import { UpsalesClient } from "../lib/client.ts";

/**
 * `GET /api/v2/self` — the user the API key belongs to, with the account (`client`) and its
 * enabled `features`. Spelled `errors` rather than `error` in this one envelope; the client
 * accepts both.
 */
type Input = Record<string, never>;

const selfGet: ActionDefinition<Input> = {
  key: "self-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the user and account the API key belongs to.",
  params: [],
  output: [{ key: "data", type: "object", label: "The current user and account" }],

  async execute(_input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", "/self");
    return { data };
  },
};

export default selfGet;
