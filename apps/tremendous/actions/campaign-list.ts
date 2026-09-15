import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/**
 * `GET /campaigns` — the campaigns configured in this account, each defining
 * a set of products a recipient can choose from plus the look and feel of the
 * reward. `list-campaigns` takes no parameters and returns everything in one
 * page.
 */
type Input = Record<string, never>;

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List all campaigns configured in this account.",
  params: [],
  output: [{ key: "campaigns", type: "array", label: "Campaigns" }],

  execute(_input, ctx) {
    return new TremendousClient(ctx).json("/campaigns");
  },
};

export default campaignList;
