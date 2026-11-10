import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/rsvp-attendee-search.ts";
import { idOf, NEWEST_FIRST, rowsOf } from "../lib/triggers.ts";

// GET /rsvps?sort_by=created&sort_order=desc&page_size=20&page=1 — AddEvent "Search RSVP attendees"
// (https://docs.addevent.com/reference/search-rsvps).
export default pollFromListAction({
  key: "new-rsvp-attendee",
  title: "New RSVP Attendee",
  description: "The run gets each new RSVP response to one of your events.",
  action,
  input: () => ({ ...NEWEST_FIRST }),
  items: rowsOf("rsvps"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Attendee ID" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "attending", type: "string", label: "Response" },
    { key: "created", type: "string", label: "Responded at" },
  ],
  sample: {
    id: "rsvp-1",
    event_id: "ev-101",
    email: "guest@example.com",
    attending: "going",
    created: "2026-11-09 10:00:00",
  },
  maxPages: 1,
});
