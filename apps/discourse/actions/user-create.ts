import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient } from "../lib/client.ts";

/**
 * `POST /users.json`.
 *
 * All four of `name`, `email`, `password` and `username` are required by the
 * endpoint's own schema — there is no "invite by email and let them pick a
 * password" mode on this route. (Discourse has `POST /invites.json` for that;
 * it is listed in the README as deliberately not built.)
 *
 * `active` carries a caveat straight from the reference: "This param requires
 * an admin api key in the request header or it will be ignored". A non-admin
 * key does not fail — it silently creates an inactive user awaiting email
 * confirmation, which looks identical to success. The hint says so, because
 * that is the failure most likely to be misread as a Discourse bug.
 *
 * The password is a **credential belonging to the user being created**, not to
 * the connection, so it is an action param and not an auth field. It is marked
 * `type: "secret"` so it is masked in the editor and encrypted at rest like any
 * other sensitive input.
 */
interface Input {
  name: string;
  email: string;
  username: string;
  password: string;
  active?: boolean;
  approved?: boolean;
  userFields?: unknown;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Register a new forum account.",
  // Email and username are unique; a repeat call is a 422, not a no-op.
  idempotent: false,
  params: [
    { key: "name", label: "Full name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true, row: "identity" },
    { key: "username", label: "Username", type: "string", required: true, row: "identity" },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: true,
      hint: "The new account's password. Required by this endpoint — there is no invite mode here.",
    },
    {
      key: "active",
      label: "Activate immediately",
      type: "boolean",
      hint: "Skips email confirmation. Requires an ADMIN key — a non-admin key silently ignores " +
        "this and creates an unconfirmed account instead of failing.",
    },
    {
      key: "approved",
      label: "Approved",
      type: "boolean",
      advanced: true,
      hint: "Relevant when the forum requires staff approval of new accounts.",
    },
    {
      key: "userFields",
      label: "Custom user fields",
      type: "json",
      advanced: true,
      hint: 'Keyed by the field\'s numeric id, e.g. { "1": true }.',
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "message", type: "string", label: "Message" },
    { key: "user_id", type: "number", label: "User ID" },
  ],

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/users.json", {
      method: "POST",
      body: compact({
        name: input.name,
        email: input.email,
        username: input.username,
        password: input.password,
        active: input.active,
        approved: input.approved,
        user_fields: input.userFields,
      }),
    });
  },
};

export default userCreate;
