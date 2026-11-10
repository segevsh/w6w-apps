import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/campaign-list-recent.ts";

export default pollFromListAction({
  key: "new-campaign",
  title: "New Campaign",
  description:
    "The run gets each newly created email campaign (any status), from the most recently created campaigns.",
  action,
  input: () => ({ sort: "desc", fromindex: 1, range: 20 }),
  items: (result) => (result as { campaigns?: unknown[] }).campaigns ?? [],
  idOf: (item) => String((item as { campaign_key?: unknown }).campaign_key ?? ""),
  output: [
    { key: "campaign_key", type: "string", label: "Campaign key" },
    { key: "campaign_name", type: "string", label: "Campaign name" },
    { key: "campaign_status", type: "string", label: "Status" },
    { key: "created_time", type: "string", label: "Created time (epoch ms)" },
    { key: "created_date_string", type: "string", label: "Created date" },
  ],
  sample: {
    campaign_key: "f70c4878c4a47169407e63917ad24497",
    campaign_name: "November newsletter",
    campaign_status: "Draft",
    created_time: "1731153600000",
    created_date_string: "09 Nov 2026, 12:00 PM",
  },
});
