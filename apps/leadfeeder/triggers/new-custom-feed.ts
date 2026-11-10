import type { TriggerDefinition } from "@w6w/types";
import customFeedList from "../actions/custom-feed-list.ts";
import { accountIdParam } from "../lib/params.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * An account has a small bounded set of saved custom feeds and GET /v1/web-visits/custom-feeds has no sort or since filter.
 * Every check reads all pages through `custom-feed-list` and diffs the ids (`pollSnapshot`, added only).
 * https://api.leadfeeder.com/openapi.yaml, `getCustomFeeds` (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-custom-feed",
  title: "New Custom Feed",
  description:
    "The run gets each website-visitor custom feed newly created in the chosen Leadfeeder account.",
  params: [
    accountIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Custom feed ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Feed attributes" },
  ],
  sample: { id: "310", type: "custom_feed", attributes: { name: "Pricing page visitors" } },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = params as { accountId: string };
    return newRecords({
      state,
      items: await readAllPages(customFeedList, { accountId: p.accountId }, ctx),
    });
  },
};

export default trigger;
