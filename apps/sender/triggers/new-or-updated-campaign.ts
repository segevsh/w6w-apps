import { pollFromListAction } from "../../_shared/poll/mod.ts";
import campaignList from "../actions/campaign-list.ts";

/**
 * Sender documents `order` / `direction` on every list (https://api.sender.net/pagination/) and
 * shows `created` and `modified` in the campaign resource (https://api.sender.net/campaigns/get-all/).
 */
export default pollFromListAction({
  key: "new-or-updated-campaign",
  title: "New or Updated Campaign",
  description: "The run gets each campaign when it is created or modified (for example sent).",
  action: campaignList,
  input: () => ({ page: 1, limit: 100, order: "modified", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { modified?: unknown }).modified ?? ""}`,
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "modified", type: "string", label: "Modified" },
  ],
  sample: {
    id: "campaign-1",
    subject: "Autumn news",
    status: "SENT",
    modified: "2026-11-10 09:30:00",
  },
  maxPages: 1,
});
