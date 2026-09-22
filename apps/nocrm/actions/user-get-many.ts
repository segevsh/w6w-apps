import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, stringList, V2 } from "../lib/client.ts";
import { directionParam, listOutput, userRoleOptions, userStatusOptions } from "../lib/params.ts";

interface Input {
  email?: string;
  firstname?: string;
  lastname?: string;
  status?: string;
  direction?: string;
  role?: string;
  teams?: unknown;
}

/**
 * `GET /api/v2/users` — list the account's users.
 *
 * Every parameter is a row of the List-all-the-users table in noCRM's API
 * document (<https://www.nocrm.io/api>, read 2026-09-22), with its defaults:
 * `status` and `role` default to `all`, `direction` to `asc`, and `teams` takes
 * "an array of the ids or names of the teams the users belong to".
 *
 * The document's prose adds one fact worth knowing before relying on the list:
 * "The deleted users are retrieved too. Their state, `is_disabled`, is set to
 * `true` in their case." So a caller that wants only live users filters on
 * `is_disabled`, and `status: "activated"` is the vendor's own shorthand for
 * that.
 *
 * `email`, `firstname` and `lastname` are exact-match filters as documented —
 * the table describes them as the user's email/firstname/lastname, with no
 * wildcard semantics stated.
 */
const userGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "user-get-many",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List the account's users — including deactivated ones — filtered by name, email, status, " +
    "role or team (GET /api/v2/users).",
  params: [
    { key: "email", label: "Email", type: "string", hint: "The user's email address." },
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "all",
      options: userStatusOptions,
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      default: "all",
      options: userRoleOptions,
    },
    directionParam("asc"),
    {
      key: "teams",
      label: "Teams",
      type: "array",
      item: { type: "string", placeholder: "Sales" },
      advanced: true,
      hint: "Team ids or team names to restrict the list to.",
    },
  ],
  output: listOutput("Users"),

  execute(input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/users`, {
      query: {
        email: input.email,
        firstname: input.firstname,
        lastname: input.lastname,
        status: input.status,
        role: input.role,
        direction: input.direction,
        teams: stringList(input.teams)?.join(","),
      },
    });
  },
};

export default userGetMany;
