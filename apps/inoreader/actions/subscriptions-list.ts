import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `GET /reader/api/0/subscription/list` (zone 1) — the user's feeds. The vendor documents one
 * parameter, `team_assets=1`, which adds team channels. Not paginated.
 *
 * Each subscription carries `id` (`feed/<xml url>`), `title`, `categories` (folders), `sortid`,
 * `firstitemmsec`, `url`, `htmlUrl`, `iconUrl` and, for team channels, `feedType`.
 */
interface Input {
  teamAssets?: boolean;
}

const subscriptionsList: ActionDefinition<Input> = {
  key: "subscriptions-list",
  type: "read",
  resource: "subscriptions",
  title: "List Subscriptions",
  description: "List the feeds the user follows, with their folders. Not paginated.",
  params: [
    {
      key: "teamAssets",
      label: "Include team channels",
      type: "boolean",
      default: false,
      hint: "Adds team channels (feedType team_channel) to the list.",
    },
  ],
  output: [
    { key: "subscriptions", type: "array", label: "Subscriptions" },
    { key: "count", type: "number", label: "Number of subscriptions" },
  ],

  async execute(input, ctx) {
    const body = await new InoreaderClient(ctx).json<{ subscriptions?: unknown[] }>(
      "/subscription/list",
      { query: { team_assets: input.teamAssets ? 1 : undefined } },
    );
    const subscriptions = body.subscriptions ?? [];
    return { subscriptions, count: subscriptions.length };
  },
};

export default subscriptionsList;
