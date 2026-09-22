import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/me` — the profile the API key belongs to.
 *
 * Answers a `UserResponse`: the team-member record, resolved from the token.
 * It says which user and team a workflow is acting as, which is often the
 * first thing to check when a lead operation behaves unexpectedly — the key
 * may belong to an admin, an agent, or a member who cannot see the lead at all.
 *
 * This is also the auth probe (`auth/api-key.ts`), for the same reason: the
 * shape carries no key or token field, so its result is safe to store.
 */
const action: ActionDefinition = {
  key: "me-get",
  type: "read",
  resource: "me",
  title: "Get Current User",
  description: "Fetch the profile the API key resolves to (GET /v1.0/me).",
  params: [],
  output: [
    { key: "id", type: "number", label: "Member record ID" },
    { key: "teamId", type: "number", label: "Team ID" },
    { key: "memberUserId", type: "number", label: "Member user ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "roleName", type: "string", label: "Role" },
    { key: "isAdmin", type: "boolean", label: "Administrator" },
    { key: "newLeadCount", type: "number", label: "New leads routable" },
    { key: "assignedLeadCount", type: "number", label: "Assigned leads" },
  ],

  execute(_input, ctx) {
    return new LoftyClient(ctx).request("/me");
  },
};

export default action;
