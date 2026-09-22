import type { ActionDefinition } from "@w6w/types";
import { SendfoxClient } from "../lib/client.ts";

/**
 * `GET /campaigns` — the account's campaigns, 100 per page.
 *
 * The document declares no query parameters and no `per_page` here (unlike
 * `GET /contacts`), so the action exposes none. The page still reports
 * `current_page` and `total`, so how much there is to page through is visible.
 */
type Input = Record<string, never>;

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List the account's campaigns.",
  output: [
    { key: "data", type: "array", label: "Campaigns" },
    { key: "current_page", type: "number", label: "Page number" },
    { key: "total", type: "number", label: "Total campaigns" },
    { key: "per_page", type: "number", label: "Campaigns per page" },
  ],

  execute(_input, ctx) {
    return new SendfoxClient(ctx).json("/campaigns");
  },
};

export default campaignList;
