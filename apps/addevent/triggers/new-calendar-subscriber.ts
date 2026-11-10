import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/calendar-subscriber-search.ts";
import { idOf, NEWEST_FIRST, rowsOf } from "../lib/triggers.ts";

// GET /subscribers?sort_by=created&sort_order=desc&page_size=20&page=1 — AddEvent "Search
// subscribers" (https://docs.addevent.com/reference/search-subscribers). The default status filter
// is `active`, which is what a new subscriber is.
export default pollFromListAction({
  key: "new-calendar-subscriber",
  title: "New Calendar Subscriber",
  description: "The run gets each new subscriber to one of your calendars.",
  action,
  input: () => ({ ...NEWEST_FIRST }),
  items: rowsOf("subscribers"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "calendar_id", type: "string", label: "Calendar ID" },
    { key: "subscriber_status", type: "string", label: "Status" },
    { key: "calendar_type", type: "string", label: "Calendar type" },
    { key: "created", type: "string", label: "Subscribed at" },
  ],
  sample: {
    id: "sub-1",
    calendar_id: "cal-1",
    subscriber_status: "active",
    calendar_type: "google",
    created: "2026-11-09 10:00:00",
  },
  maxPages: 1,
});
