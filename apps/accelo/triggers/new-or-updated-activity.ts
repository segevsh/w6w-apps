import { pollFromListAction } from "../../_shared/poll/mod.ts";
import activityList from "../actions/activity-list.ts";

type Activity = { id?: unknown; date_modified?: unknown };

/**
 * `GET /activities` documents `date_modified` (unix ts, "the date the event was last modified") as an
 * activity field, requested with `_fields`, and the order filter `order_by_desc(date_modified)`
 * (https://api.accelo.com/docs/). The most recently modified come first; an edit changes the
 * `id:date_modified` key, so it is a new event.
 */
export default pollFromListAction({
  key: "new-or-updated-activity",
  title: "New or Updated Activity",
  description:
    "The run gets each activity that is newly created or edited (an edit is a new event).",
  action: activityList,
  input: () => ({
    fields: "date_modified",
    orderBy: "date_modified",
    orderDirection: "desc",
    limit: 100,
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const a = item as Activity;
    return `${a.id ?? ""}:${a.date_modified ?? ""}`;
  },
  output: [
    { key: "id", type: "string", label: "Activity ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "date_modified", type: "string", label: "Modified (unix ts)" },
  ],
  sample: { id: "101", subject: "Call with client", date_modified: "1795000000" },
  maxPages: 1,
});
