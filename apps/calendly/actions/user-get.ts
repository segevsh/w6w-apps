import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient, uuidOf } from "../lib/client.ts";

interface Input {
  user: string;
}

/**
 * GET /users/{uuid} — a single user by URI or UUID. Accepts either the full
 * `https://api.calendly.com/users/…` URI (as returned in other resources) or the
 * bare UUID.
 */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a Calendly user by URI or UUID.",
  params: [
    {
      key: "user",
      label: "User URI or UUID",
      type: "string",
      required: true,
      hint: "e.g. https://api.calendly.com/users/AAAA or just AAAA.",
    },
  ],
  output: [
    { key: "resource", type: "object", label: "User" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request(`/users/${encodeURIComponent(uuidOf(input.user))}`);
  },
};

export default userGet;
