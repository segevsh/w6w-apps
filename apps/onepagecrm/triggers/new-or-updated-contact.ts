import action from "../actions/list-contacts.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each contact that is created or edited in OnePageCRM, most recently modified first. Fires once per modification.",
  action,
  wrapper: "contact",
  sortBy: "modified_at",
  sample: {
    contact: { id: "contact_1", last_name: "Rivera", modified_at: "2026-11-10T09:00:00Z" },
  },
});
