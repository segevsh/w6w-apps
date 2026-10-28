import type { ActionDefinition } from "@w6w/types";
import {
  sendUsers,
  USERS_OUTPUT,
  type UsersInput,
  usersParams,
  type UsersResponse,
} from "../lib/users.ts";

/**
 * Removes members from ONE audience: `/{custom_audience_id}/users` with
 * `method=DELETE`, with the same hashing as Add Users. Removing a person from
 * every audience on the account (`/act_{id}/usersofanyaudience`) is a separate
 * endpoint and is not covered; see README.
 */
const removeUsers: ActionDefinition<UsersInput, UsersResponse> = {
  key: "remove-users",
  type: "perform",
  resource: "custom-audience-user",
  idempotent: true,
  title: "Remove Users from Custom Audience",
  description:
    "Remove people from a customer-file custom audience. Identifiers are normalised and SHA-256 hashed exactly as in Add Users, so the same values match.",
  params: usersParams("remove"),
  output: USERS_OUTPUT,

  async execute(input, ctx) {
    return await sendUsers(input, ctx, true);
  },
};

export default removeUsers;
