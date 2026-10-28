import type { ActionDefinition } from "@w6w/types";
import { entraError, GraphClient, userPath } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
  newPassword: string;
  forceChangePasswordNextSignIn?: boolean;
}

/**
 * `PATCH /users/{id | userPrincipalName}` with a `passwordProfile`
 *
 * https://learn.microsoft.com/en-us/graph/api/user-update?view=graph-rest-1.0 (Example 3: "Update
 * the passwordProfile of a user and reset their password")
 *
 * This is how Graph resets *another* user's password — an update of `passwordProfile`, answering
 * `204 No Content`. (The separate `changePassword` call needs the user's own current password and
 * is not offered here.) Least privileged permission: `User-PasswordProfile.ReadWrite.All`; this App
 * requests `User.ReadWrite.All`, which the reference lists as sufficient. In a delegated context
 * the signed-in user needs at least the User Administrator role for non-admin targets and the
 * Privileged Authentication Administrator role to reset an administrator's password. It cannot be
 * used for federated users. Microsoft's best practice, repeated in the hint, is to force a change
 * at next sign-in.
 *
 * The new password is never logged and never echoed in the result.
 */
const resetUserPassword: ActionDefinition<Input, { reset: boolean; userId: string }> = {
  key: "reset-user-password",
  type: "perform",
  resource: "user",
  title: "Reset User Password",
  description: "Set a new password for a user, as an administrator.",
  idempotent: true,
  params: [
    userIdParam,
    {
      key: "newPassword",
      label: "New password",
      type: "secret",
      required: true,
      hint: "Must satisfy the tenant's password policy.",
    },
    {
      key: "forceChangePasswordNextSignIn",
      label: "Force password change at next sign-in",
      type: "boolean",
      default: true,
      hint: "Microsoft's stated best practice is to always set this to true.",
    },
  ],
  output: [
    { key: "reset", type: "boolean", label: "Reset" },
    { key: "userId", type: "string", label: "User id or principal name" },
  ],

  async execute(input, ctx) {
    if (!input.newPassword) throw new Error(entraError("New password is required."));
    const client = new GraphClient(ctx);
    ctx.log("info", "resetting user password", { userId: input.userId });
    await client.request(userPath(input.userId), {
      method: "PATCH",
      body: {
        passwordProfile: {
          forceChangePasswordNextSignIn: input.forceChangePasswordNextSignIn ?? true,
          password: input.newPassword,
        },
      },
    });
    return { reset: true, userId: input.userId };
  },
};

export default resetUserPassword;
