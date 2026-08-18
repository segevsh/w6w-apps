import type { ActionDefinition } from "@w6w/types";
import { Auth0Client, compact, json } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `PATCH /api/v2/users/{id}` — change a user, or block them.
 *
 * ## Metadata is merged, one level deep — which is not the same as merged
 *
 * Auth0 merges the top-level keys of `user_metadata` and `app_metadata` with
 * what is there. But a key whose value is an **object is replaced entirely**,
 * not merged recursively: sending `{"preferences":{"theme":"dark"}}` to a user
 * whose preferences also held `language` loses the language.
 *
 * Setting a top-level key to `null` deletes it, which is the only way to remove
 * one.
 *
 * ## Blocking is not deleting, and it is the reversible one
 *
 * `blocked: true` stops the user signing in and keeps everything about them.
 * It is what an offboarding or abuse workflow should do: it can be undone, it
 * preserves the audit trail, and it does not free the email address for a fresh
 * signup the way a delete does.
 *
 * ## Some fields cannot be changed together
 *
 * Auth0 rejects a request that changes `email` and `password` at once, and
 * changing either on a user whose identity lives at an external provider is
 * refused outright — those fields belong to Google or the SAML IdP, not to
 * Auth0. The error names the rule, and the client surfaces its `errorCode`.
 */
const action: ActionDefinition = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update or block user",
  description:
    "Change a user's profile or metadata, or block them from signing in. Blocking is the " +
    "reversible alternative to deleting, and keeps the audit trail.",
  idempotent: true,
  params: [
    USER_ID_PARAM,
    {
      key: "blocked",
      label: "Blocked",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Blocked — cannot sign in" },
        { value: "false", label: "Unblocked" },
      ],
      hint: "Reversible, unlike a delete, and keeps the user's history.",
    },
    { key: "email", label: "Email", type: "string", default: "" },
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "emailVerified",
      label: "Email Verified",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Verified" },
        { value: "false", label: "Not verified" },
      ],
    },
    {
      key: "userMetadata",
      label: "User Metadata",
      type: "json",
      default: "",
      hint: "Merged at the TOP LEVEL only — a nested object replaces the whole nested object. " +
        "Set a key to `null` to remove it.",
    },
    {
      key: "appMetadata",
      label: "App Metadata",
      type: "json",
      default: "",
      hint: "Same merge rule. This is the half the user cannot edit.",
    },
    {
      key: "connection",
      label: "Connection",
      type: "string",
      default: "",
      advanced: true,
      hint: "Required by Auth0 when changing `email` — it names which identity is being edited.",
    },
  ],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "blocked", type: "boolean", label: "Blocked" },
    { key: "app_metadata", type: "object", label: "App metadata" },
    { key: "user_metadata", type: "object", label: "User metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");

    const blocked = String(p.blocked ?? "");
    const emailVerified = String(p.emailVerified ?? "");
    const body = compact({
      email: p.email,
      name: p.name,
      connection: p.connection,
      user_metadata: json(p.userMetadata, "userMetadata"),
      app_metadata: json(p.appMetadata, "appMetadata"),
    });
    if (blocked) body.blocked = blocked === "true";
    if (emailVerified) body.email_verified = emailVerified === "true";
    if (Object.keys(body).length === 0) throw new Error("nothing to update");

    if (body.email && !body.connection) {
      throw new Error(
        "changing `email` needs `connection` too — Auth0 requires it to know which identity is " +
          "being edited",
      );
    }

    ctx.log(blocked === "true" ? "warn" : "info", "updating an Auth0 user", {
      userId,
      fields: Object.keys(body),
    });
    return await new Auth0Client(ctx).request(`/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default action;
