import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/calendar-search.ts";
import { idOf, NEWEST_FIRST, rowsOf } from "../lib/triggers.ts";

// GET /calendars?sort_by=created&sort_order=desc&page_size=20&page=1 — AddEvent "Search calendars"
// (https://docs.addevent.com/reference/search-calendars).
export default pollFromListAction({
  key: "new-calendar",
  title: "New Calendar",
  description: "The run gets each newly created calendar.",
  action,
  input: () => ({ ...NEWEST_FIRST }),
  items: rowsOf("calendars"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "link_short", type: "string", label: "Short link" },
  ],
  sample: {
    id: "cal-1",
    title: "Company events",
    timezone: "Europe/London",
    link_short: "https://example.com/c/1",
  },
  maxPages: 1,
});
