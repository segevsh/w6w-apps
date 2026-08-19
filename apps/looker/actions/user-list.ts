import type { ActionDefinition } from "@w6w/types";
import { LookerClient, query } from "../lib/client.ts";

/**
 * `GET /api/4.0/users` — who has access to this Looker.
 *
 * ## The licence question, which is what a Looker admin is usually asking
 *
 * Looker is licensed per user, and disabled users do not count while
 * still existing. So the useful figures are how many are enabled, how many are
 * disabled, and how many have never logged in — the third being the clearest
 * sign of a seat nobody needs.
 *
 * ## `credentials_api3` is the field that says who can automate
 *
 * A user with API3 credentials can do everything this app can do. Reviewing
 * that list is how somebody finds out which integrations exist, because nothing
 * else records it — a credential is created and then lives in whatever system
 * uses it.
 *
 * ## Embed users are not people
 *
 * `credentials_embed` marks a user created by signed embedding. They can vastly
 * outnumber real users, are not licensed the same way, and counting them as
 * staff makes every access review wrong.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List users",
  description:
    "Looker users, separating real accounts from EMBED users — which can vastly outnumber them " +
    "and are not the same thing. Counts who holds API credentials, which is the only record of " +
    "which integrations exist.",
  params: [
    {
      key: "email",
      label: "Email Contains",
      type: "string",
      default: "",
    },
    { key: "perPage", label: "Page Size", type: "number", default: 100 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "users", type: "array", label: "The users" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "enabledCount", type: "number", label: "Not disabled — these consume licences" },
    { key: "disabledCount", type: "number", label: "Disabled, and still present" },
    { key: "neverLoggedInCount", type: "number", label: "Seats nobody has used" },
    { key: "withApiCredentials", type: "array", label: "Who can automate against this instance" },
    { key: "embedCount", type: "number", label: "Created by embedding — not people" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const all = await new LookerClient(ctx).request<
      Array<{
        id?: string;
        display_name?: string;
        email?: string;
        is_disabled?: boolean;
        credentials_api3?: Array<{ client_id?: string }>;
        credentials_embed?: Array<unknown>;
        // Absent when the user has never signed in.
        credentials_email?: { logged_in_at?: string } | null;
      }>
    >("/users", {
      query: query({
        fields: "id,display_name,email,is_disabled,credentials_api3(client_id)," +
          "credentials_embed(id),credentials_email(logged_in_at)",
        per_page: Math.min(1000, Math.max(1, Number(p.perPage ?? 100))),
        page: Math.max(1, Number(p.page ?? 1)),
      }),
    });

    const list = Array.isArray(all) ? all : [];
    const needle = String(p.email ?? "").trim().toLowerCase();
    const users = needle
      ? list.filter((user) => String(user?.email ?? "").toLowerCase().includes(needle))
      : list;

    // Embed users are created by signed embedding and are not staff.
    const embed = users.filter((user) => (user?.credentials_embed ?? []).length > 0);
    const people = users.filter((user) => (user?.credentials_embed ?? []).length === 0);

    return {
      users,
      count: users.length,
      enabledCount: people.filter((user) => user?.is_disabled !== true).length,
      disabledCount: people.filter((user) => user?.is_disabled === true).length,
      // The clearest sign of a seat nobody needs.
      neverLoggedInCount: people.filter((user) => !user?.credentials_email?.logged_in_at).length,
      withApiCredentials: people
        .filter((user) => (user?.credentials_api3 ?? []).length > 0)
        .map((user) => user?.display_name ?? user?.email)
        .filter(Boolean),
      embedCount: embed.length,
    };
  },
};

export default action;
