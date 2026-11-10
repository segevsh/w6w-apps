import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/rsvp-form-list.ts";
import { idOf, rowsOf } from "../lib/triggers.ts";

// GET /events/rsvp-forms — "List RSVP forms": sorted by creation date, newest first
// (https://docs.addevent.com/reference/list-rsvp-forms).
export default pollFromListAction({
  key: "new-rsvp-form",
  title: "New RSVP Form",
  description: "The run gets each newly created custom RSVP form.",
  action: action as never,
  input: () => ({}),
  items: rowsOf("items"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "form-1", name: "Dietary needs" },
  maxPages: 1,
});
