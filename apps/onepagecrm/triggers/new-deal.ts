import action from "../actions/list-deals.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-deal",
  title: "New Deal",
  description: "The run gets each deal newly created in OnePageCRM, newest first.",
  action,
  wrapper: "deal",
  sortBy: "created_at",
  sample: {
    deal: { id: "deal_1", name: "Website redesign", created_at: "2026-11-10T09:00:00Z" },
    contacts: [],
  },
});
