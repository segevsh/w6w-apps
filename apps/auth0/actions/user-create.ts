import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, compact, json } from "../lib/client.ts";

/**
 * `POST /api/v2/users` — create a user in a database connection.
 *
 * ## `connection` is required, and it decides everything
 *
 * A user does not exist in "Auth0"; they exist in a **connection**. Creating
 * one requires naming it, and only *database* connections can be written to —
 * a user cannot be created in a Google or SAML connection, because their
 * identity lives at the provider.
 *
 * The connection also becomes part of the user's id (`auth0|…` for the default
 * database), which is why the same address in two connections is two users with
 * two ids. `connection-list` shows what a tenant has.
 *
 * ## Metadata: the distinction that matters later
 *
 *   - **`user_metadata`** is data the *user* may change about themselves —
 *     display name, preferences.
 *   - **`app_metadata`** is data the *application* controls — plan, roles,
 *     internal ids — and the user cannot edit it.
 *
 * Putting an entitlement in `user_metadata` is the mistake this distinction
 * exists to prevent: it ends up editable by the person it restricts.
 *
 * ## Passwords
 *
 * A password can be set here, and mostly should not be: it means the workflow
 * has handled one. `password-change-ticket` invites the user to set their own
 * instead, and `verification-email-send` confirms the address. Both keep the
 * secret out of the automation entirely.
 */
const action: ActionDefinition = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create user",
  description:
    "Create a user in a database connection. Only database connections can be written to — a " +
    "Google or SAML identity lives at the provider, not here.",
  idempotent: false,
  params: [
    {
      key: "connection",
      label: "Connection",
      type: "string",
      required: true,
      default: "Username-Password-Authentication",
      hint: "The database connection's NAME. `connection-list` shows them; only `auth0`-strategy " +
        "ones accept a created user.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      default: "",
      advanced: true,
      hint: "Usually better left empty: send a password-change ticket instead, so the secret " +
        "never passes through the workflow.",
    },
    {
      key: "emailVerified",
      label: "Mark Email Verified",
      type: "boolean",
      default: false,
      hint: "Only when the address was already verified elsewhere — asserting it falsely " +
        "defeats the verification.",
    },
    {
      key: "verifyEmail",
      label: "Send Verification Email",
      type: "boolean",
      default: true,
      hint: "Auth0 emails the user to confirm the address on creation.",
    },
    {
      key: "userMetadata",
      label: "User Metadata",
      type: "json",
      default: "",
      hint: "Data the USER may change about themselves.",
    },
    {
      key: "appMetadata",
      label: "App Metadata",
      type: "json",
      default: "",
      hint: "Data the APPLICATION controls and the user cannot edit — where an entitlement " +
        "belongs.",
    },
  ],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "identities", type: "array", label: "Identities" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connection = String(p.connection ?? "").trim();
    if (!connection) {
      throw new Error("`connection` is required — a user exists in a connection, not in a tenant");
    }
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    ctx.log("info", "creating an Auth0 user", { connection });
    return await new Auth0Client(ctx).request("/users", {
      method: "POST",
      body: compact({
        connection,
        email,
        name: p.name,
        password: p.password,
        email_verified: p.emailVerified === true ? true : undefined,
        verify_email: p.verifyEmail === false ? false : undefined,
        user_metadata: json(p.userMetadata, "userMetadata"),
        app_metadata: json(p.appMetadata, "appMetadata"),
      }),
    });
  },
};

export default action;
