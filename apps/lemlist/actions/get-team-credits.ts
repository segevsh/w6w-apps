import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

/**
 * `GET /team/credits`.
 *
 * Credits are lemlist's consumable currency — its own definition: "Credits are
 * the coins a team uses to enrich emails, LinkedIn URLs, etc. via the enrich
 * route. Each enrichment feature needs a certain amount of credits to run." The
 * enrichment flags on Add Lead to Campaign (`findEmail`, `verifyEmail`,
 * `findPhone`, `linkedinEnrichment`) all draw on this balance.
 *
 * The response splits the remaining total by provenance — `freemium`,
 * `subscription`, `gifted`, `paid` — which matters because those replenish on
 * different schedules.
 *
 * `health/quota.ts` reads this same endpoint, so a workflow can branch on
 * headroom before spending and a host can report it without a second call.
 */
const getTeamCredits: ActionDefinition<Record<string, never>> = {
  key: "get-team-credits",
  type: "read",
  resource: "team",
  title: "Get Team Credits",
  description:
    "Read the team's remaining enrichment credits, broken down by freemium, subscription, gifted and paid.",
  params: [],
  output: [
    { key: "credits", type: "number", label: "Total credits remaining" },
    { key: "details", type: "object", label: "Remaining credits by provenance" },
  ],

  execute(_input, ctx) {
    return new LemlistClient(ctx).request("/team/credits");
  },
};

export default getTeamCredits;
