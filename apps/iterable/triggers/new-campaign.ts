import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listCampaigns from "../actions/list-campaigns.ts";

export default pollFromListAction({
  key: "new-campaign",
  title: "New Campaign",
  description: "Fires when a new Iterable campaign is created.",
  action: listCampaigns,
  input: () => ({ page: 1, pageSize: 100, sort: "-createdAt" }),
  items: (result) => (result as { campaigns?: unknown[] }).campaigns ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Campaign ID" }],
  sample: { id: "campaign_123" },
});
