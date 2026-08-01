import type { ActionDefinition } from "@w6w/types";
import { CAL_API_VERSION, CalClient } from "../lib/client.ts";

interface Input {
  username?: string;
  usernames?: string[];
  orgSlug?: string;
}

/**
 * GET /v2/event-types — the event types (meeting templates) owned by a user,
 * a set of users, or an organization. `cal-api-version: 2024-06-14`.
 */
const eventTypeGetMany: ActionDefinition<Input> = {
  key: "event-type-get-many",
  type: "read",
  resource: "event-type",
  title: "List Event Types",
  description: "List event types, optionally scoped to a username or organization.",
  params: [
    { key: "username", label: "Username", type: "string" },
    {
      key: "usernames",
      label: "Usernames",
      type: "multiselect",
      advanced: true,
      hint: "Multiple usernames (team event types).",
    },
    { key: "orgSlug", label: "Organization slug", type: "string", advanced: true },
  ],
  output: [{ key: "data", type: "array", label: "Event types" }],

  execute(input, ctx) {
    return new CalClient(ctx).request("/event-types", {
      headers: { "cal-api-version": CAL_API_VERSION.eventTypes },
      query: {
        username: input.username,
        usernames: input.usernames,
        orgSlug: input.orgSlug,
      },
    });
  },
};

export default eventTypeGetMany;
