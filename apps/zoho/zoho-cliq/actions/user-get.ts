import type { ActionDefinition } from "@w6w/types";
import { seg, unwrapData, ZohoCliqClient } from "../lib/client.ts";

interface Input {
  user: string;
}

interface Output {
  user: Record<string, unknown>;
}

/**
 * `GET /api/v2/users/{USER_ID}?fields=all` (or `{USER_EMAIL_ID}`) — scope
 * `ZohoCliq.Users.READ`. The record is wrapped as `{ data: {...} }`.
 */
const userGet: ActionDefinition<Input, Output> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get one user's full profile by user id or email address.",
  params: [{
    key: "user",
    label: "User ID or email",
    type: "string",
    required: true,
    hint: "The Zoho user id (`zuid`) or the user's email address.",
  }],
  output: [{ key: "user", type: "object", label: "User" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request(`/users/${seg(input.user)}`, {
      query: { fields: "all" },
    });
    return { user: unwrapData(body) };
  },
};

export default userGet;
