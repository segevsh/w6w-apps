import type { ActionDefinition } from "@w6w/types";
import { csv, unset, ZendeskClient } from "../lib/client.ts";

interface Input {
  name: string;
  email?: string;
  role?: string;
  phone?: string;
  organizationId?: number;
  tags?: string;
  externalId?: string;
  verified?: boolean;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create an end user, agent or admin.",
  // Zendesk mints a new user id. Use `user-create-or-update` for a retry-safe
  // upsert keyed on email or external id.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    {
      key: "role",
      label: "Role",
      type: "select",
      default: "end-user",
      options: [
        { value: "end-user", label: "End user" },
        { value: "agent", label: "Agent" },
        { value: "admin", label: "Admin" },
      ],
    },
    { key: "organizationId", label: "Organization ID", type: "number" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
    {
      key: "verified",
      label: "Verified",
      type: "boolean",
      advanced: true,
      hint: "Skip the verification email for this address.",
    },
  ],
  output: [
    { key: "user.id", type: "number", label: "User ID" },
    { key: "user.name", type: "string", label: "Name" },
    { key: "user.email", type: "string", label: "Email" },
    { key: "user.role", type: "string", label: "Role" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request("/users.json", {
      method: "POST",
      body: {
        user: {
          name: input.name,
          email: unset(input.email),
          phone: unset(input.phone),
          role: unset(input.role),
          organization_id: input.organizationId,
          tags: csv(input.tags),
          external_id: unset(input.externalId),
          verified: input.verified,
        },
      },
    });
  },
};

export default userCreate;
