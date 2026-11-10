import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "list-entry-deleted",
  title: "List Entry Deleted",
  event: "list_entry.deleted",
  noun: "list entry",
  sampleBody: { "id": 388, "list_id": 26, "entity_id": 38706, "entity_type": 0 },
});
