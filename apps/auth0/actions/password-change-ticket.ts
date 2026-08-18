import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, compact } from "../lib/client.ts";

/**
 * `POST /api/v2/tickets/password-change` — mint a one-time link for a user to
 * set their own password.
 *
 * The right way for an automation to deal with passwords: it never handles one.
 * The response is a URL that the workflow can email, show, or hand to another
 * system, and the user sets the secret themselves.
 *
 * ## The ticket is a bearer credential
 *
 * Anyone holding the URL can set that account's password until it expires or is
 * used. It should be treated exactly like a password in transit — not logged,
 * not put in a Slack channel, not stored. `ttl_sec` is the control that
 * matters: the default is long, and a workflow that emails the link
 * immediately has no reason not to shorten it.
 *
 * ## It works for a user who does not exist yet
 *
 * Given an `email` and a `connection` rather than a `user_id`, Auth0 will
 * create the user when the ticket is used — which turns "invite somebody" into
 * one call instead of create-then-invite, and avoids leaving a half-made user
 * behind if the invitation is never accepted.
 */
const action: ActionDefinition = {
  key: "password-change-ticket",
  type: "perform",
  resource: "user",
  title: "Create a password-change ticket",
  description:
    "Mint a one-time URL for a user to set their own password — so the workflow never handles " +
    "one. Treat the URL itself as a secret.",
  idempotent: false,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      default: "",
      hint: "For an existing user. Alternative to email + connection.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      default: "",
      hint: "With a connection, this works for somebody who does not exist yet — Auth0 creates " +
        "them when the ticket is used.",
    },
    {
      key: "connection",
      label: "Connection",
      type: "string",
      default: "",
      hint: "Required when using an email rather than a user id.",
    },
    {
      key: "ttlSeconds",
      label: "Valid For (seconds)",
      type: "number",
      default: 3600,
      hint: "Shorter is better: the URL is a bearer credential for that account until it " +
        "expires or is used.",
    },
    {
      key: "resultUrl",
      label: "Redirect After",
      type: "string",
      default: "",
      advanced: true,
      hint: "Where Auth0 sends the user once the password is set. Must be an allowed callback " +
        "URL on the tenant.",
    },
    {
      key: "markEmailVerified",
      label: "Mark Email Verified",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Using the ticket proves the user reads that mailbox, so this is a reasonable " +
        "verification for an invited user.",
    },
  ],
  output: [
    { key: "ticket", type: "string", label: "Ticket URL (treat as a secret)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    const email = String(p.email ?? "").trim();
    const connection = String(p.connection ?? "").trim();

    if (!userId && !email) throw new Error("give either `userId` or `email`");
    if (userId && email) {
      throw new Error("give either `userId` or `email`, not both — they select the user two ways");
    }
    if (email && !connection) {
      throw new Error("`connection` is required when identifying the user by email");
    }

    const ttl = Number(p.ttlSeconds ?? 3600);
    // Deliberately not logged: the response is a credential.
    ctx.log("info", "minting an Auth0 password-change ticket", { byEmail: Boolean(email), ttl });

    return await new Auth0Client(ctx).request("/tickets/password-change", {
      method: "POST",
      body: compact({
        user_id: userId || undefined,
        email: email || undefined,
        connection_id: undefined,
        connection: connection || undefined,
        ttl_sec: Number.isFinite(ttl) && ttl > 0 ? ttl : undefined,
        result_url: p.resultUrl,
        mark_email_as_verified: p.markEmailVerified === true ? true : undefined,
      }),
    });
  },
};

export default action;
