import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/calendar-template-list.ts";
import { idOf, rowsOf } from "../lib/triggers.ts";

// GET /calendars/templates?type=<type> — "List calendar templates": sorted by creation date, newest
// first (https://docs.addevent.com/reference/list-calendar-templates).
export default pollFromListAction<{ type?: string }>({
  key: "new-calendar-template",
  title: "New Calendar Template",
  description:
    "The run gets each newly created calendar landing-page or embeddable-calendar template.",
  action,
  params: [{
    key: "type",
    label: "Template type",
    type: "select",
    default: "calendar-landing",
    options: [
      { value: "calendar-landing", label: "Calendar landing page (default)" },
      { value: "calendar-embed", label: "Embeddable calendar" },
    ],
  }],
  input: (params) => ({ type: params.type || "calendar-landing" }),
  items: rowsOf("items"),
  idOf,
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "template-201", name: "Brand landing page" },
  maxPages: 1,
});
