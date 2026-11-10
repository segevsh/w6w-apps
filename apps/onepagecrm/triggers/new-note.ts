import action from "../actions/list-notes.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-note",
  title: "New Note",
  description: "The run gets each note newly logged in OnePageCRM, newest first.",
  action,
  wrapper: "note",
  sortBy: "created_at",
  sample: {
    note: { id: "note_1", text: "Called, wants a quote", created_at: "2026-11-10T09:00:00Z" },
  },
});
