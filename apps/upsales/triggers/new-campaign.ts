import campaignList from "../actions/campaign-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-campaign",
  title: "New Campaign",
  action: campaignList,
  output: [{ key: "id", type: "number", label: "Campaign ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
