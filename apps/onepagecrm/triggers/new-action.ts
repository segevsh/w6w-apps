import action from "../actions/list-actions.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-action",
  title: "New Next Action",
  description: "The run gets each next action newly created in OnePageCRM, newest first.",
  action,
  wrapper: "action",
  sortBy: "created_at",
  sample: { action: { id: "action_1", text: "Send proposal", created_at: "2026-11-10T09:00:00Z" } },
});
