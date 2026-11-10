import action from "../actions/list-deals.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-or-updated-deal",
  title: "New or Updated Deal",
  description:
    "The run gets each deal that is created or edited in OnePageCRM, most recently modified first. Fires once per modification.",
  action,
  wrapper: "deal",
  sortBy: "modified_at",
  sample: {
    deal: { id: "deal_1", name: "Website redesign", modified_at: "2026-11-10T09:00:00Z" },
    contacts: [],
  },
});
