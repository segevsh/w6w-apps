import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";

/**
 * `POST /user_management/users` — create an identity that can sign in.
 *
 * ## `email_verified` is a security decision, not a convenience flag
 *
 * Setting it true says *this address has been proved to belong to this person*,
 * on your authority instead of WorkOS's. That matters because WorkOS links
 * accounts by verified email: a later SSO sign-in with the same address
 * attaches to this user. Marking an unproven address verified therefore lets
 * whoever supplied it receive an account that a real employee's SSO login will
 * later join.
 *
 * It is correct when you are migrating users who were already verified in the
 * old system, and wrong when the address came from a form. It defaults to false
 * and says so.
 *
 * ## Passwords
 *
 * `password` is accepted and deliberately **not** offered here. A workflow that
 * sets passwords has them in its inputs, its logs and its run history, and
 * WorkOS's own flow — invite, or magic link — does not. If a password truly
 * must be set, it belongs somewhere a workflow's history is not stored.
 */
const action: ActionDefinition = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create a user",
  description:
    "Create an identity that can sign in. Marking the email verified says you proved it — " +
    "WorkOS links a later SSO login to a verified address.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true, default: "" },
    { key: "firstName", label: "First Name", type: "string", default: "" },
    { key: "lastName", label: "Last Name", type: "string", default: "" },
    {
      key: "emailVerified",
      label: "Email Already Verified",
      type: "boolean",
      default: false,
      hint: "Only when the address was proved elsewhere — a migration. A later SSO sign-in with " +
        "this address joins this account.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Your own id for this person.",
    },
    { key: "metadata", label: "Metadata", type: "json", default: "", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    const user = await new WorkOSClient(ctx).request<{ id?: string }>(
      "/user_management/users",
      {
        method: "POST",
        body: compact({
          email,
          first_name: p.firstName,
          last_name: p.lastName,
          email_verified: p.emailVerified === true ? true : undefined,
          external_id: p.externalId,
          metadata: p.metadata,
        }),
      },
    );

    // The id, not the address — a run log is not the place for somebody's email.
    ctx.log("info", "created a WorkOS user", { userId: user?.id });
    return user;
  },
};

export default action;
