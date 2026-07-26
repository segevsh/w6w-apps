import type { ActionDefinition } from "@w6w/types";
import { csv, unset, ZendeskClient } from "../lib/client.ts";

interface Input {
  userId: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  organizationId?: number;
  tags?: string;
  suspended?: boolean;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update a user's profile, role or suspension state.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
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
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. REPLACES the user's current tags.",
    },
    { key: "suspended", label: "Suspended", type: "boolean" },
  ],
  output: [
    { key: "user.id", type: "number", label: "User ID" },
    { key: "user.suspended", type: "boolean", label: "Suspended" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request(`/users/${input.userId}.json`, {
      method: "PUT",
      body: {
        user: {
          name: unset(input.name),
          email: unset(input.email),
          phone: unset(input.phone),
          role: unset(input.role),
          organization_id: input.organizationId,
          tags: csv(input.tags),
          suspended: input.suspended,
        },
      },
    });
  },
};

export default userUpdate;
