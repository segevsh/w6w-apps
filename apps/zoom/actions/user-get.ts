import type { ActionDefinition } from "@w6w/types";
import { ZoomClient } from "../lib/client.ts";

const userGet: ActionDefinition<{ userId?: string }> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a Zoom user. Defaults to whoever the connection authenticates as.",
  params: [
    {
      key: "userId",
      label: "User",
      type: "string",
      default: "me",
      hint: "`me`, a user id, or the user's email address.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "type", type: "number", label: "Licence type" },
    { key: "timezone", type: "string", label: "Timezone" },
  ],

  execute(input, ctx) {
    return new ZoomClient(ctx).request(`/users/${encodeURIComponent(input.userId || "me")}`);
  },
};

export default userGet;
