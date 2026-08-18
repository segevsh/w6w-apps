import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /api/v2/users/{id}` — one user, by Auth0's own id.
 *
 * **Immediately consistent**, unlike the search endpoint — which is the whole
 * reason to prefer it. A user created a moment ago is readable here at once,
 * and is not necessarily in `user-list` yet.
 *
 * The id carries its connection as a prefix: `auth0|…` for a database user,
 * `google-oauth2|…` for a Google login, `samlp|…` for an enterprise one. The
 * same human with two login methods is **two users** with two ids, unless
 * somebody linked their identities — which is why `identities` is worth reading
 * and why an email is not a key.
 */
const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get user",
  description:
    "One user by id — immediately consistent, unlike search. The id's prefix names the " +
    "connection they signed up through.",
  params: [
    USER_ID_PARAM,
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated fields to return.",
    },
  ],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "email_verified", type: "boolean", label: "Email verified" },
    { key: "name", type: "string", label: "Name" },
    { key: "blocked", type: "boolean", label: "Blocked" },
    { key: "identities", type: "array", label: "Identities" },
    { key: "app_metadata", type: "object", label: "App metadata" },
    { key: "user_metadata", type: "object", label: "User metadata" },
    { key: "last_login", type: "string", label: "Last login" },
    { key: "logins_count", type: "number", label: "Logins" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    return await new Auth0Client(ctx).request(`/users/${encodeURIComponent(userId)}`, {
      query: { fields: String(p.fields ?? "") || undefined },
    });
  },
};

export default action;
