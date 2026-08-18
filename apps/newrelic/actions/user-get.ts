import type { ActionDefinition } from "@w6w/types";
import { NewRelicClient } from "../lib/client.ts";

/**
 * `{ actor { user { id name email } } }` — who this key is.
 *
 * A user key inherits its user's permissions entirely: what the key can see and
 * change is exactly what that person can. So "which user is this key" is the
 * same question as "what can this connection do", and it is worth being able to
 * ask — particularly when a workflow starts failing on writes it used to
 * manage, which is usually somebody's role having been narrowed rather than
 * anything about the key.
 *
 * It is also the cheapest possible query, which is why the connection test and
 * the `credentials` health check both use it.
 */
const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "account",
  title: "Get the current user",
  description:
    "Who this key belongs to. A user key carries exactly that person's permissions, so this is " +
    "also the answer to what the connection can do.",
  params: [],
  output: [
    { key: "user", type: "object", label: "The user" },
    { key: "id", type: "string", label: "Their id" },
    { key: "name", type: "string", label: "Their name" },
    { key: "email", type: "string", label: "Their email" },
    { key: "region", type: "string", label: "Which data centre this connection reads" },
  ],

  async execute(_input, ctx) {
    const client = new NewRelicClient(ctx);
    const data = await client.gql<{
      actor?: { user?: { id?: number; name?: string; email?: string } };
    }>("{ actor { user { id name email } } }");

    const user = data?.actor?.user;
    return {
      user,
      id: user?.id,
      name: user?.name,
      email: user?.email,
      region: client.region,
    };
  },
};

export default action;
