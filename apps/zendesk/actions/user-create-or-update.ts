import type { ActionDefinition } from "@w6w/types";
import { csv, unset, ZendeskClient } from "../lib/client.ts";

interface Input {
  name: string;
  email?: string;
  externalId?: string;
  phone?: string;
  role?: string;
  organizationId?: number;
  tags?: string;
}

/**
 * Zendesk matches an existing user on `external_id` first, then `email`. This
 * is the retry-safe way to get a user: unlike `user-create`, running it twice
 * leaves one user rather than failing on a duplicate email.
 */
const userCreateOrUpdate: ActionDefinition<Input> = {
  key: "user-create-or-update",
  type: "perform",
  resource: "user",
  title: "Create or Update User",
  description:
    "Upsert a user, matched on external ID then email. Safe to re-run, unlike `user-create`.",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "string",
      row: "key",
      hint: "Match key when no external ID is given.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      row: "key",
      hint: "Preferred match key — checked before email.",
    },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "end-user", label: "End user" },
        { value: "agent", label: "Agent" },
        { value: "admin", label: "Admin" },
      ],
    },
    { key: "organizationId", label: "Organization ID", type: "number" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
  ],
  output: [
    { key: "user.id", type: "number", label: "User ID" },
    { key: "user.email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request("/users/create_or_update.json", {
      method: "POST",
      body: {
        user: {
          name: input.name,
          email: unset(input.email),
          external_id: unset(input.externalId),
          phone: unset(input.phone),
          role: unset(input.role),
          organization_id: input.organizationId,
          tags: csv(input.tags),
        },
      },
    });
  },
};

export default userCreateOrUpdate;
