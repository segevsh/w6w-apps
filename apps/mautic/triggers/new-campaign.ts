import type { TriggerDefinition } from "@w6w/types";
import campaignList from "../actions/campaign-list.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `GET /campaigns` is a small collection read in full through `campaign-list` (`returnAll`, `start`/`limit`
 * paging; https://devdocs.mautic.org/en/7.1/rest_api/campaigns.html, 2026-11-10); a check diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-campaign",
  title: "New Campaign",
  description: "The run gets each campaign that appears in Mautic.",
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isPublished", type: "boolean", label: "Published" },
    { key: "dateAdded", type: "string", label: "Created at" },
  ],
  sample: {
    "id": 3,
    "name": "Welcome Campaign",
    "isPublished": true,
    "dateAdded": "2026-11-09T09:30:00+00:00",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => newRecords({ state, action: campaignList, ctx }),
};

export default trigger;
