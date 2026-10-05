import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/user`
 */
type Input = Record<string, never>;

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "account",
  title: "Get User",
  description:
    "The authenticated seller's profile: name, bio, user_id, public url (and email, with the view_sales scope).",
  params: [],
  output: [{ "key": "user_id", "type": "string", "label": "User id" }, {
    "key": "name",
    "type": "string",
    "label": "Display name",
  }],

  async execute(_input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/user`);
    return body.user;
  },
};

export default userGet;
