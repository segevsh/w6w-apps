import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/** `GET /v3/a/{account_id}/users/{user_id}.json` — a single user. */
interface Input {
  accountId: string;
  userId: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a single CallRail user by id.",
  params: [
    accountIdParam,
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      placeholder: "USR8154748ae6bd4e278a7cddd38a662f4f",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Full name" },
    { key: "role", type: "string", label: "admin, manager or reporting" },
    { key: "companies", type: "array", label: "Companies this user can access" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/users/${encodeId(input.userId)}.json`,
    );
  },
};

export default userGet;
