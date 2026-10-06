import type { ActionDefinition } from "@w6w/types";
import {
  sendUsers,
  USERS_OUTPUT,
  type UsersInput,
  usersParams,
  type UsersResponse,
} from "../lib/users.ts";

/**
 * `POST /{custom_audience_id}/users`. Customer data is normalised and SHA-256
 * hashed in `lib/audience-data.ts` before it reaches `ctx.fetch`. Meta says
 * changes "usually take up to 24 hours" to show in the audience.
 */
const addUsers: ActionDefinition<UsersInput, UsersResponse> = {
  key: "add-users",
  type: "perform",
  resource: "custom-audience-user",
  idempotent: true,
  title: "Add Users to Custom Audience",
  description:
    "Add people to a customer-file custom audience from emails, phones, names and other identifiers. Values are normalised and SHA-256 hashed by this app before upload (up to 10,000 per request).",
  params: usersParams("add"),
  output: USERS_OUTPUT,

  async execute(input, ctx) {
    return await sendUsers(input, ctx, false);
  },
};

export default addUsers;
