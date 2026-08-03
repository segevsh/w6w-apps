import type { ActionDefinition } from "@w6w/types";
import { CAMPAIGN_STATUS_OPTIONS, LemlistClient } from "../lib/client.ts";

interface Input {
  state?: "running" | "paused" | "draft" | "ended" | "archived" | "errors";
}

/**
 * `GET /team/senders`.
 *
 * Returns each sending user paired with the campaigns they send for, including
 * that campaign's `sendingChannels` (`email`, `manual`, `linkedinVisit`, …).
 *
 * The `state` filter is documented as filtering by **the campaign's** state, not
 * the sender's — "Filter by campaign's state (running, paused, draft, ended,
 * archived, errors)" — so it narrows the nested campaign lists rather than the
 * set of senders. The param label says so, because "state" on an endpoint called
 * `senders` reads like a property of the sender.
 */
const listTeamSenders: ActionDefinition<Input> = {
  key: "list-team-senders",
  type: "search",
  resource: "team",
  title: "List Team Senders",
  description:
    "List the team's sending users, each with the campaigns they send for and those campaigns' sending channels.",
  params: [
    {
      key: "state",
      label: "Campaign state",
      type: "select",
      options: CAMPAIGN_STATUS_OPTIONS,
      hint: "Filters by the CAMPAIGN's state, not the sender's — it narrows each sender's nested " +
        "campaign list.",
    },
  ],
  output: [{ key: "senders", type: "array", label: "Senders with their campaigns" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request<unknown[]>("/team/senders", {
      query: { state: input.state },
    });
  },
};

export default listTeamSenders;
