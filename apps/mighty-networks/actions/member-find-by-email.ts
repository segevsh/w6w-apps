import type { ActionDefinition } from "@w6w/types";
import { MightyClient } from "../lib/client.ts";

/** `GET /members/by_email` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  email: string;
}

const memberFindByEmail: ActionDefinition<Input> = {
  key: "member-find-by-email",
  type: "read",
  resource: "member",
  title: "Find Member by Email",
  description: "Look a member up by email address.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Member (user) id" },
    { key: "email", type: "string", label: "Email address" },
    { key: "member_type", type: "string", label: "'full' or 'limited'" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "location", type: "string", label: "Location" },
    { key: "bio", type: "string", label: "Bio" },
    { key: "avatar", type: "string", label: "Avatar URL" },
    { key: "permalink", type: "string", label: "Profile URL" },
    { key: "ambassador_level", type: "string", label: "Ambassador level" },
    { key: "last_visited_at", type: "string", label: "Last visit (ISO 8601)" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
    { key: "updated_at", type: "string", label: "Updated (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request("/members/by_email", { query: { email: input.email } });
  },
};

export default memberFindByEmail;
