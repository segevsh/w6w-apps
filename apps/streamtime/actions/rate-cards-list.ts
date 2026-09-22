import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";

/**
 * `GET /rate_cards` — every rate card, unpaginated.
 *
 * A rate card is `{ id, name, currency }` and nothing more: the rates
 * themselves live on the users and job items that reference a card, which is
 * worth knowing before looking for a "rate" field here.
 */
const rateCardsList: ActionDefinition<Record<string, never>> = {
  key: "rate-cards-list",
  type: "search",
  resource: "rate-card",
  title: "List Rate Cards",
  description: "List all rate cards for the organisation. Unpaginated.",
  params: [],
  output: [
    { key: "rateCards", type: "array", label: "Rate cards — `{ id, name, currency }`" },
  ],

  async execute(_input, ctx) {
    const rateCards = await new StreamtimeClient(ctx).request<unknown[]>("/rate_cards");
    return { rateCards: rateCards ?? [] };
  },
};

export default rateCardsList;
