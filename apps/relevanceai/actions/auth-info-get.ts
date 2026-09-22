import type { ActionDefinition } from "@w6w/types";
import { RelevanceAiClient } from "../lib/client.ts";

/**
 * `GET /auth/info` — which project, user and key this Connection is using.
 *
 * The same endpoint the auth probe calls, exposed as an action so a workflow can
 * assert on identity rather than just liveness: `permissions` is a nested
 * project/organization role map, and `role`, `company` and `email` name the
 * caller. That makes it the natural guard step before a run that should only
 * happen for the right project.
 *
 * ## No credential comes back
 *
 * The shape is `GetAuthHeaderInfoOutput`: `user_id`, `key_id`, `email`,
 * `first_name`, `last_name`, `company`, `role`, `label`, `notes`, `tags`,
 * `profile_picture_url`, `onboarded` and `permissions` — and no key, token,
 * secret or hash of one. Confirmed against the live schema and against a real
 * 200 from a live key, which is why this action is safe to expose and safe for
 * the probe to use.
 *
 * A `json`-free, parameter-free read: there is nothing to configure, because the
 * question it answers is entirely determined by the Connection.
 */
const authInfoGet: ActionDefinition<Record<string, never>> = {
  key: "auth-info-get",
  type: "read",
  resource: "account",
  title: "Get Auth Info",
  description: "Report which project, user and key this connection is authenticated as.",
  params: [],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "key_id", type: "string", label: "Key ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "company", type: "string", label: "Company" },
    { key: "role", type: "string", label: "Role" },
    { key: "permissions", type: "object", label: "Project/organization roles" },
  ],

  execute(_input, ctx) {
    return new RelevanceAiClient(ctx).json("/auth/info");
  },
};

export default authInfoGet;
