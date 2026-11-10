import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/campaign-list.ts";

const trigger = pollFromListAction({
  key: "new-or-updated-campaign",
  title: "New or Updated Campaign",
  description: "The run gets each newly created or updated Braze campaign.",
  action,
  input: (params) => ({ ...params, page: 0, includeArchived: false, sortDirection: "desc" }),
  items: (result) => (result as { campaigns?: unknown[] }).campaigns ?? [],
  idOf: (item) => {
    const campaign = item as { id?: string; updated_at?: string; last_edited?: string };
    return `${campaign.id}:${campaign.updated_at ?? campaign.last_edited ?? ""}`;
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Campaign ID" }],
  sample: { id: "campaign_1", name: "Updated campaign", updated_at: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});

export default trigger;
