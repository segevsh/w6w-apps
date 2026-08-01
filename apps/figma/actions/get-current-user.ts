import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

/**
 * GET /v1/me — the authenticated user. Requires `current_user:read`. Also
 * the probe both auth methods' `test` hooks use, and the cheapest available
 * "who am I" call Figma exposes (there is no unauthenticated ping endpoint).
 */
const getCurrentUser: ActionDefinition<Record<string, never>> = {
  key: "get-current-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the authenticated user's profile.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "handle", type: "string", label: "Handle" },
    { key: "email", type: "string", label: "Email" },
    { key: "img_url", type: "string", label: "Avatar URL" },
  ],

  execute(_input, ctx) {
    const client = new FigmaClient(ctx);
    return client.request(`/v1/me`);
  },
};

export default getCurrentUser;
