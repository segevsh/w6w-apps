import { pollFromListAction } from "../../_shared/poll/mod.ts";
import campaignList from "../actions/campaign-list.ts";

/**
 * `GET /campaigns` lists the user's campaigns "newest first"
 * (https://docs.seamless.ai/api-reference/v2/campaigns/list-campaigns); the first 50 are enough
 * to see everything created since a check.
 */
export default pollFromListAction({
  key: "new-campaign",
  title: "New Campaign",
  description: "The run gets each campaign created since the last check.",
  action: campaignList,
  input: (params) => ({ ...params, limit: 50 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { campaignId: string | number }).campaignId),
  params: (campaignList.params ?? []).filter((p) => p.key === "searchText"),
  output: [
    { key: "campaignId", type: "string", label: "Campaign ID" },
    { key: "identifier", type: "string", label: "Campaign identifier" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    campaignId: "88",
    identifier: "q4-outbound",
    name: "Q4 outbound",
    status: "active",
    createdAt: "2026-11-10T09:00:00.000Z",
  },
  maxPages: 1,
});
