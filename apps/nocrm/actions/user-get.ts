import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, V2 } from "../lib/client.ts";
import { userOutput } from "../lib/params.ts";

interface Input {
  userId: string;
}

/**
 * `GET /api/v2/users/{id}` — retrieve one user.
 *
 * The Retrieve-a-user table in noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) takes a single parameter whose
 * description is "The id of the user **or its email address**. Make sure to
 * encode the email address properly." The id is therefore a string and is
 * percent-encoded before it reaches the path, so `john.doe@example.com` becomes
 * one path segment rather than four.
 *
 * This is the action a workflow uses to resolve the person behind the numeric
 * `user_id` that leads carry, or to look somebody up by address without first
 * listing the whole account.
 */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve one user by id or email address (GET /api/v2/users/{id}).",
  params: [
    {
      key: "userId",
      label: "User",
      type: "string",
      required: true,
      hint: "The user's id, or their email address — the document accepts either and requires " +
        "the address to be encoded, which this action does.",
    },
  ],
  output: userOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(`${V2}/users/${encodeURIComponent(input.userId)}`);
  },
};

export default userGet;
