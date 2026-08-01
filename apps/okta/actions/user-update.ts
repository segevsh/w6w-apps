import type { ActionDefinition } from "@w6w/types";
import { compact, OktaClient, unset } from "../lib/client.ts";

interface Input {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  department?: string;
  mobilePhone?: string;
}

/**
 * `POST /api/v1/users/{id}` is Okta's PARTIAL update — only the `profile`
 * fields present in the body are touched, everything else on the profile is
 * left alone. (`PUT` is a full replace and would null out every field this
 * action doesn't ask for, so it is deliberately not used here.)
 */
const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Partially update a user's profile. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID or login", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "mobilePhone", label: "Mobile phone", type: "string", row: "contact" },
    { key: "title", label: "Title", type: "string", row: "org" },
    { key: "department", label: "Department", type: "string", row: "org" },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "lastUpdated", type: "string", label: "Last updated" },
  ],

  execute(input, ctx) {
    return new OktaClient(ctx).request(`/users/${encodeURIComponent(input.userId)}`, {
      method: "POST",
      body: {
        profile: compact({
          firstName: unset(input.firstName),
          lastName: unset(input.lastName),
          email: unset(input.email),
          mobilePhone: unset(input.mobilePhone),
          title: unset(input.title),
          department: unset(input.department),
        }),
      },
    });
  },
};

export default userUpdate;
