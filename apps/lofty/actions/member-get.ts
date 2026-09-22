import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/members/{account}` — one team member, by login email.
 *
 * The path parameter is the member's **login email**, not their id — the
 * account identifier Lofty uses, which is what makes this the endpoint to reach
 * for when a workflow has an email from somewhere else. The member must have
 * accepted the team invitation.
 *
 * The response is the same member shape the list returns: `id`, `memberUserId`,
 * `roleName`, `isAdmin`, `agentInfo`, and so on.
 */
interface Input {
  account: string;
}

const action: ActionDefinition<Input> = {
  key: "member-get",
  type: "read",
  resource: "member",
  title: "Get Team Member",
  description: "Fetch a team member by their login email (GET /v1.0/members/{account}).",
  params: [
    {
      key: "account",
      label: "Member email",
      type: "string",
      required: true,
      placeholder: "alice@example.com",
      hint: "The member's Lofty login email. The member must have accepted the team invitation.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Member record ID" },
    { key: "memberUserId", type: "number", label: "Member user ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "roleName", type: "string", label: "Role" },
    { key: "isAdmin", type: "boolean", label: "Administrator" },
    { key: "assignedLeadCount", type: "number", label: "Assigned leads" },
  ],

  execute(input, ctx) {
    return new LoftyClient(ctx).request(`/members/${encodeURIComponent(input.account)}`);
  },
};

export default action;
