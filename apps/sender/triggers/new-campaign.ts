import { pollFromListAction } from "../../_shared/poll/mod.ts";
import campaignList from "../actions/campaign-list.ts";

/**
 * Sender documents `order` / `direction` on every list (https://api.sender.net/pagination/) and
 * shows `created` and `modified` in the campaign resource (https://api.sender.net/campaigns/get-all/).
 */
export default pollFromListAction({
  key: "new-campaign",
  title: "New Campaign",
  description: "The run gets each newly created campaign.",
  action: campaignList,
  input: () => ({ page: 1, limit: 100, order: "created", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "created", type: "string", label: "Created" },
  ],
  sample: {
    id: "campaign-1",
    subject: "Autumn news",
    status: "DRAFT",
    created: "2026-11-10 09:00:00",
  },
  maxPages: 1,
});
