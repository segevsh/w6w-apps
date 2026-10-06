import type { ActionDefinition } from "@w6w/types";
import { SignWellClient } from "../lib/client.ts";

/**
 * `GET /api/v1/me` — verified against SignWell's OpenAPI document (`getMe`, "Get credentials").
 * Returns the membership role, the user, the account/workspace (plan tier, active templates,
 * preferences) and the contact. The body carries no credential material.
 */
const accountGet: ActionDefinition = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Read who the API key belongs to and the account's plan and signing preferences.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Membership id" },
    { key: "role", type: "string", label: "Role (owner, admin, member)" },
    { key: "user", type: "object", label: "User (id, name, email)" },
    { key: "account", type: "object", label: "Account (plan_tier, active_templates, preferences)" },
    { key: "workspace", type: "object", label: "Workspace" },
    { key: "contact", type: "object", label: "Contact record" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "getting the SignWell account");
    return await new SignWellClient(ctx).request("/me");
  },
};

export default accountGet;
