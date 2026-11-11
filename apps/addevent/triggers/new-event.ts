import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/event-search.ts";
import { idOf, NEWEST_FIRST, rowsOf } from "../lib/triggers.ts";

// GET /events?sort_by=created&sort_order=desc&page_size=20&page=1 — AddEvent "Search events":
// "The default sorting is created, desc" (https://docs.addevent.com/reference/search-events).
export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each newly created event.",
  action,
  input: () => ({ ...NEWEST_FIRST }),
  items: rowsOf("events"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "calendar_id", type: "string", label: "Calendar ID" },
    { key: "datetime_start", type: "string", label: "Starts at" },
    { key: "datetime_end", type: "string", label: "Ends at" },
    { key: "link_short", type: "string", label: "Short link" },
  ],
  sample: {
    id: "ev-101",
    title: "Quarterly planning",
    calendar_id: "cal-1",
    datetime_start: "2026-12-01 09:00:00",
    datetime_end: "2026-12-01 10:00:00",
    link_short: "https://example.com/e/101",
  },
  maxPages: 1,
});
