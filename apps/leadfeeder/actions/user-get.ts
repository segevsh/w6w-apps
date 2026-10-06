import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
import { dataOutput, metaOutput } from "../lib/params.ts";

type Input = Record<string, never>;

/** `GET /v1/users/me` — verified against the vendor OpenAPI document (2026-10-06). */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Return the identity of the API key owner (email, name, role). Needs no account id.",
  params: [],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(_input, ctx) {
    const path = "/v1/users/me";
    const query = {};
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default userGet;
