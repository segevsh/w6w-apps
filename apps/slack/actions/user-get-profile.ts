import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  user: string;
  includeLabels?: boolean;
}

const userGetProfile: ActionDefinition<Input> = {
  key: "user-get-profile",
  type: "read",
  resource: "user",
  title: "Get User Profile",
  description: "Retrieves a user profile (users.profile.get).",
  params: [
    { key: "user", label: "User ID", type: "string", required: true },
    { key: "includeLabels", label: "Include labels", type: "boolean" },
  ],

  output: [
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "real_name", type: "string", label: "Real name" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "title", type: "string", label: "Title" },
    { key: "status_text", type: "string", label: "Status text" },
    { key: "status_emoji", type: "string", label: "Status emoji" },
    { key: "status_expiration", type: "number", label: "Status expiration (unix seconds)" },
    { key: "image_192", type: "string", label: "Avatar URL (192px)" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ profile?: unknown }>("/users.profile.get", {
      query: { user: input.user, include_labels: input.includeLabels },
    });
    return res.profile ?? res;
  },
};

export default userGetProfile;
